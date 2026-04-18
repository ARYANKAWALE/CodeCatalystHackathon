import hashlib
import io
import logging
import os
import secrets
from datetime import datetime, date, timedelta, timezone
from functools import wraps
from urllib.parse import urlparse

import jwt
from flask import Flask, jsonify, request, send_file, send_from_directory, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sqlalchemy import false as sql_false, func, inspect as sa_inspect, or_, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from config import Config
from mail_utils import mail_config_snapshot, mail_ready, schedule_plain_email
from models import db, User, Student, Company, Internship, Placement, Appeal, Notification, Vacancy, Application
from notification_templates import (
    appeal_accepted,
    appeal_received,
    appeal_rejected,
    internship_added_to_profile,
    internship_status_changed,
    password_reset,
    placement_added_to_profile,
    placement_status_changed,
    sign_in_notice,
    welcome_register,
)
from phone_utils import normalize_india_phone

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "static_frontend")
APPLICATION_RESUME_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "application_resumes")
MAX_APPLICATION_RESUME_BYTES = 5 * 1024 * 1024  # 5 MB

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path="")
app.config.from_object(Config)

CORS(app, resources={r"/api/*": {"origins": "*"}}, methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
db.init_app(app)

logging.getLogger("mail_utils").setLevel(logging.INFO)

_mail_cfg = mail_config_snapshot(app)
if not mail_ready(_mail_cfg):
    logging.getLogger(__name__).warning(
        "SMTP is not fully configured (set MAIL_SERVER and MAIL_USERNAME or MAIL_DEFAULT_SENDER). "
        "Password reset, welcome, and notification emails will be skipped until SMTP env vars are set."
    )

_frontend = (app.config.get("FRONTEND_URL") or "").strip().lower()
if os.environ.get("RENDER", "").lower() in ("true", "1") and (
    not _frontend or "localhost" in _frontend or "127.0.0.1" in _frontend
):
    logging.getLogger(__name__).warning(
        "FRONTEND_URL still targets localhost on Render. Set FRONTEND_URL in the service environment "
        "to your deployed frontend origin (no trailing slash) so password-reset email links work."
    )

# ── JWT helpers ────────────────────────────────────────────────────────────────

def create_token(user):
    payload = {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=app.config["JWT_EXPIRATION_HOURS"]),
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            try:
                uid = int(data["user_id"])
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid token"}), 401
            g.current_user = db.session.get(User, uid)
            if not g.current_user:
                return jsonify({"error": "User not found"}), 401
            ensure_user_student_link(g.current_user)
            if current_user_role() == "student" and not g.current_user.student_id:
                return jsonify({"error": "Invalid username or password"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if current_user_role() != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def current_user_role():
    """Normalized role for access checks (lowercase, trimmed)."""
    r = g.current_user.role
    if r is None:
        return ""
    return str(r).strip().lower()


def ensure_user_student_link(user):
    """If role is student but student_id is unset, link User to Student by email or username=roll_number."""
    if user is None:
        return
    r = (getattr(user, "role", None) or "").strip().lower()
    if r != "student" or user.student_id:
        return
    stu = None
    email = (user.email or "").strip().lower()
    if email:
        stu = Student.query.filter(db.func.lower(Student.email) == email).first()
    if not stu:
        uname = (user.username or "").strip().lower()
        if uname:
            stu = Student.query.filter(db.func.lower(Student.roll_number) == uname).first()
    if not stu:
        return
    user.student_id = stu.id
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()


def student_data_scope():
    """(is_student_role, student_id). Admins get (False, None). Students without a linked row get (True, None)."""
    u = g.current_user
    if current_user_role() != "student":
        return (False, None)
    return (True, u.student_id)


def student_primary_email(user):
    """Registered email for notifications: student profile email when linked, else account email."""
    if (getattr(user, "role", None) or "").strip().lower() != "student":
        return None
    account = (user.email or "").strip() or None
    if user.student_id:
        stu = db.session.get(Student, user.student_id)
        if stu:
            prof = (stu.email or "").strip()
            if prof:
                return prof
    return account


def student_notification_email(student):
    """Deliver to Student.profile email when set, else linked User account email."""
    if student is None:
        return None
    e = (student.email or "").strip()
    if e:
        return e
    u = User.query.filter_by(student_id=student.id).first()
    return (u.email or "").strip() if u else None


def user_account_email_for_reset(user):
    """Always use the account email for password reset (login identity)."""
    return (user.email or "").strip() or None


def notify_student_by_email(app, student, subject, body, log_label: str):
    """Send mail to the student's profile or linked account email; log if no address."""
    if student is None:
        return
    to_addr = student_notification_email(student)
    if to_addr:
        schedule_plain_email(app, to_addr, subject, body)
    else:
        logging.getLogger(__name__).warning("%s: no email for student id=%s", log_label, student.id)


def _user_id_for_student(student_id):
    if not student_id:
        return None
    u = User.query.filter_by(student_id=student_id).first()
    return u.id if u else None


def _admin_user_ids():
    return [
        r[0]
        for r in db.session.query(User.id).filter(func.lower(User.role) == "admin").all()
    ]


def _add_notification(user_id, kind, title, body=None, link=None):
    if not user_id:
        return
    kt = (kind or "general")[:40]
    tl = (title or "")[:200]
    lk = link[:500] if link else None
    n = Notification(
        user_id=user_id,
        kind=kt,
        title=tl,
        body=(body or "") or "",
        link=lk,
    )
    db.session.add(n)


def _notify_student_in_app(student_id, kind, title, body=None, link=None):
    _add_notification(_user_id_for_student(student_id), kind, title, body, link)


def _notify_all_admins(kind, title, body=None, link=None):
    for uid in _admin_user_ids():
        _add_notification(uid, kind, title, body, link)


def hash_password_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, you will receive a link to reset your password shortly."
)


def _validate_new_password(password: str):
    if not password or len(password) < 6:
        return "Password must be at least 6 characters"
    return None


def parse_date(val):
    if not val:
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except ValueError:
        return None


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    role = data.get("role", "admin")

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if role not in ("admin", "student"):
        return jsonify({"error": "Role must be admin or student"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(username=username, email=email, role=role)
    user.set_password(password)

    if role == "student":
        roll_number = data.get("roll_number", "").strip()
        name = data.get("name", "").strip()
        department = data.get("department", "").strip()
        course = data.get("course", "").strip()
        year = data.get("year")
        if not roll_number or not name or not department or not course or not year:
            return jsonify({"error": "Student registration requires name, roll_number, department, course, and year"}), 400
        if Student.query.filter_by(roll_number=roll_number).first():
            return jsonify({"error": "Roll number already exists"}), 409
        if Student.query.filter_by(email=email).first():
            return jsonify({"error": "A student with this email already exists"}), 409
        phone_norm, phone_err = normalize_india_phone(data.get("phone", ""))
        if phone_err:
            return jsonify({"error": phone_err}), 400
        student = Student(
            name=name, roll_number=roll_number, email=email,
            department=department, course=course, year=int(year),
            phone=phone_norm,
            cgpa=float(data["cgpa"]) if data.get("cgpa") else None,
            skills=data.get("skills", "").strip(),
        )
        db.session.add(student)
        db.session.flush()
        user.student_id = student.id

    db.session.add(user)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    token = create_token(user)
    role_lc = (user.role or "").strip().lower()
    if role_lc == "student" and user.student_id:
        stu = db.session.get(Student, user.student_id)
        greet = f"Hello {stu.name},\n\n" if stu else "Hello,\n\n"
    else:
        greet = "Hello,\n\n"
    role_label = "student" if role_lc == "student" else "administrator"
    subj, welcome_body = welcome_register(greet_line=greet, username=username, role_label=role_label)
    schedule_plain_email(app, user.email.strip(), subj, welcome_body)
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = User.query.filter_by(username=username).first()
    if not user and "@" in username:
        user = User.query.filter_by(email=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401
    ensure_user_student_link(user)
    if (getattr(user, "role", None) or "").strip().lower() == "student" and not user.student_id:
        return jsonify({"error": "Invalid username or password"}), 401
    token = create_token(user)
    if app.config.get("MAIL_SIGN_IN_EMAIL"):
        to_addr = student_primary_email(user) or (user.email or "").strip() or None
        if to_addr:
            when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            si_subj, si_body = sign_in_notice(username=user.username, when_utc=when)
            schedule_plain_email(app, to_addr, si_subj, si_body)
    return jsonify({"token": token, "user": user.to_dict()})


@app.route("/api/auth/me")
@token_required
def auth_me():
    return jsonify({"user": g.current_user.to_dict()})


@app.route("/api/auth/forgot-password", methods=["POST"])
def auth_forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400

    user = User.query.filter(db.func.lower(User.email) == email).first()
    if user:
        raw = secrets.token_urlsafe(32)
        user.password_reset_token_hash = hash_password_reset_token(raw)
        mins = max(5, int(app.config.get("PASSWORD_RESET_EXPIRATION_MINUTES") or 60))
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(minutes=mins)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

        base = (app.config.get("FRONTEND_URL") or "http://localhost:5173").rstrip("/")
        link = f"{base}/reset-password?token={raw}"
        to_addr = user_account_email_for_reset(user)
        if to_addr:
            pr_subj, pr_body = password_reset(username=user.username, link=link, minutes=mins)
            schedule_plain_email(app, to_addr, pr_subj, pr_body)

    return jsonify({"message": FORGOT_PASSWORD_MESSAGE})


@app.route("/api/auth/reset-password", methods=["POST"])
def auth_reset_password():
    data = request.get_json() or {}
    raw_token = (data.get("token") or "").strip()
    password = data.get("password", "")
    err = _validate_new_password(password)
    if err:
        return jsonify({"error": err}), 400
    if not raw_token:
        return jsonify({"error": "Reset token is required"}), 400

    token_hash = hash_password_reset_token(raw_token)
    user = User.query.filter_by(password_reset_token_hash=token_hash).first()
    now = datetime.now(timezone.utc)
    if not user or not user.password_reset_expires:
        return jsonify({"error": "Invalid or expired reset link"}), 400
    exp = user.password_reset_expires
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    user.set_password(password)
    user.password_reset_token_hash = None
    user.password_reset_expires = None
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    return jsonify({"message": "Your password has been updated. You can sign in with your new password."})


@app.route("/api/auth/password", methods=["PUT"])
@token_required
def auth_change_password():
    data = request.get_json() or {}
    current = data.get("current_password", "")
    new_pw = data.get("new_password", "")
    err = _validate_new_password(new_pw)
    if err:
        return jsonify({"error": err}), 400
    if not g.current_user.check_password(current):
        return jsonify({"error": "Current password is incorrect"}), 400
    g.current_user.set_password(new_pw)
    g.current_user.password_reset_token_hash = None
    g.current_user.password_reset_expires = None
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    return jsonify({"message": "Password updated successfully."})


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════


def _counts_grouped(model, statuses_tuple):
    """Single query: {status: count} for all known statuses (missing = 0)."""
    rows = db.session.query(model.status, func.count(model.id)).group_by(model.status).all()
    out = {s: 0 for s in statuses_tuple}
    for st, n in rows:
        if st in out:
            out[st] = int(n)
    return out


@app.route("/api/dashboard")
@token_required
def dashboard():
    r = current_user_role()
    # Admins always get the system dashboard (even if student_id is set). Never show admin charts to real students.
    if r != "admin" and (r == "student" or g.current_user.student_id):
        if not g.current_user.student_id:
            return jsonify({"error": "Student profile is not linked to this account."}), 403
        sid = g.current_user.student_id
        student = (
            Student.query.options(
                joinedload(Student.internships).joinedload(Internship.student),
                joinedload(Student.internships).joinedload(Internship.company),
                joinedload(Student.placements).joinedload(Placement.student),
                joinedload(Student.placements).joinedload(Placement.company),
            )
            .filter_by(id=sid)
            .first()
        )
        if not student:
            return jsonify({"error": "Student not found"}), 404
        appeal_rows = (
            db.session.query(Appeal.status, func.count(Appeal.id))
            .filter(Appeal.student_id == sid)
            .group_by(Appeal.status)
            .all()
        )
        appeal_counts = {s: 0 for s in Appeal.STATUSES}
        for st, n in appeal_rows:
            if st in appeal_counts:
                appeal_counts[st] = int(n)
        return jsonify({
            "type": "student",
            "viewer_role": "student",
            "student": student.to_dict(include_relations=True),
            "appeal_counts": appeal_counts,
        })

    if r != "admin":
        return jsonify({"error": "You do not have access to this dashboard."}), 403

    # ── Admin dashboard ───────────────────────────────────────────────────────
    # One round-trip for common totals (important on remote Postgres e.g. Render).
    totals = db.session.execute(
        text(
            "SELECT "
            "(SELECT COUNT(*) FROM students) AS n_students, "
            "(SELECT COUNT(*) FROM companies) AS n_companies, "
            "(SELECT COUNT(*) FROM internships) AS n_internships, "
            "(SELECT COUNT(*) FROM placements) AS n_placements, "
            "(SELECT COUNT(*) FROM internships WHERE status = 'ongoing') AS n_active_internships, "
            "(SELECT COUNT(*) FROM internships WHERE status = 'completed') AS n_completed_internships, "
            "(SELECT COUNT(*) FROM appeals WHERE status = 'pending') AS n_pending_appeals"
        )
    ).mappings().one()
    total_students = int(totals["n_students"] or 0)
    total_companies = int(totals["n_companies"] or 0)
    total_internships = int(totals["n_internships"] or 0)
    total_placements = int(totals["n_placements"] or 0)
    active_internships = int(totals["n_active_internships"] or 0)
    completed_internships = int(totals["n_completed_internships"] or 0)
    pending_appeals = int(totals["n_pending_appeals"] or 0)

    # Students with at least one placed placement (not raw placement row count)
    placed_count = (
        db.session.query(func.count(func.distinct(Placement.student_id)))
        .filter(Placement.status == "placed")
        .scalar()
    )
    placed_count = int(placed_count or 0)

    agg = (
        db.session.query(
            func.avg(Placement.package_lpa),
            func.max(Placement.package_lpa),
        )
        .filter(Placement.status == "placed")
        .one()
    )
    avg_raw, max_raw = agg[0], agg[1]
    avg_package = round(float(avg_raw), 2) if avg_raw is not None else 0
    highest_package = float(max_raw) if max_raw is not None else 0

    dept_stats = db.session.query(
        Student.department, db.func.count(Student.id)
    ).group_by(Student.department).all()

    internship_status_counts = _counts_grouped(Internship, Internship.STATUSES)
    placement_status_counts = _counts_grouped(Placement, Placement.STATUSES)

    recent_placements = [
        p.to_dict()
        for p in Placement.query.options(
            joinedload(Placement.student),
            joinedload(Placement.company),
        )
        .order_by(Placement.created_at.desc())
        .limit(5)
        .all()
    ]
    recent_internships = [
        i.to_dict()
        for i in Internship.query.options(
            joinedload(Internship.student),
            joinedload(Internship.company),
        )
        .order_by(Internship.created_at.desc())
        .limit(5)
        .all()
    ]

    return jsonify({
        "type": "admin",
        "viewer_role": "admin",
        "total_students": total_students,
        "total_companies": total_companies,
        "total_internships": total_internships,
        "total_placements": total_placements,
        "active_internships": active_internships,
        "completed_internships": completed_internships,
        "placed_students": placed_count,
        "avg_package": avg_package,
        "highest_package": highest_package,
        "dept_stats": [[d, c] for d, c in dept_stats],
        "internship_status_counts": internship_status_counts,
        "placement_status_counts": placement_status_counts,
        "placement_status_order": list(Placement.STATUSES),
        "recent_placements": recent_placements,
        "recent_internships": recent_internships,
        "pending_appeals": pending_appeals,
    })


# ══════════════════════════════════════════════════════════════════════════════
# STUDENTS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/students")
@token_required
def students_list():
    if current_user_role() == "student":
        return jsonify({"error": "Admin access required"}), 403
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)
    department = request.args.get("department", "")
    year = request.args.get("year", "")

    q = Student.query
    if department:
        q = q.filter_by(department=department)
    if year:
        q = q.filter_by(year=int(year))

    pag = q.order_by(Student.name).paginate(page=page, per_page=per_page, error_out=False)
    departments = [r[0] for r in db.session.query(Student.department).distinct().order_by(Student.department).all()]

    return jsonify({
        "items": [s.to_dict() for s in pag.items],
        "total": pag.total,
        "page": pag.page,
        "pages": pag.pages,
        "has_next": pag.has_next,
        "has_prev": pag.has_prev,
        "departments": departments,
    })


@app.route("/api/students", methods=["POST"])
@admin_required
def students_create():
    data = request.get_json() or {}
    required = ["name", "roll_number", "email", "department", "course", "year"]
    for f in required:
        if not data.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    phone_norm, phone_err = normalize_india_phone(data.get("phone", ""))
    if phone_err:
        return jsonify({"error": phone_err}), 400
    student = Student(
        name=data["name"].strip(),
        roll_number=data["roll_number"].strip(),
        email=data["email"].strip(),
        phone=phone_norm,
        department=data["department"].strip(),
        course=data["course"].strip(),
        year=int(data["year"]),
        cgpa=float(data["cgpa"]) if data.get("cgpa") else None,
        skills=data.get("skills", "").strip(),
        resume_link=data.get("resume_link", "").strip(),
    )
    db.session.add(student)
    try:
        db.session.commit()
        return jsonify(student.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/students/<int:id>")
@token_required
def students_get(id):
    is_stu, vsid = student_data_scope()
    if is_stu and (not vsid or id != vsid):
        return jsonify({"error": "Forbidden"}), 403
    student = db.session.get(Student, id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student.to_dict(include_relations=True))


@app.route("/api/students/<int:id>", methods=["PUT"])
@admin_required
def students_update(id):
    student = db.session.get(Student, id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    data = request.get_json() or {}
    for field in ["name", "roll_number", "email", "department", "course", "year", "phone", "cgpa", "skills", "resume_link"]:
        if field in data:
            val = data[field]
            if field == "phone":
                norm, err = normalize_india_phone(val)
                if err:
                    return jsonify({"error": err}), 400
                val = norm
            elif field == "year":
                val = int(val)
            elif field == "cgpa":
                val = float(val) if val else None
            elif isinstance(val, str):
                val = val.strip()
            setattr(student, field, val)
    try:
        db.session.commit()
        return jsonify(student.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/students/<int:id>", methods=["DELETE"])
@admin_required
def students_delete(id):
    student = db.session.get(Student, id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    try:
        # users.student_id FK blocks deleting the student row unless unlinked first
        for u in User.query.filter_by(student_id=id).all():
            role_lc = (getattr(u, "role", "") or "").strip().lower()
            if role_lc == "student":
                for a in Appeal.query.filter_by(reviewer_user_id=u.id).all():
                    a.reviewer_user_id = None
                db.session.delete(u)
            else:
                u.student_id = None
        db.session.delete(student)
        db.session.commit()
        return jsonify({"message": "Student deleted"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


RESUME_LINK_MAX_LEN = 2048


def _validate_resume_url(link):
    """Empty clears the field. Non-empty must be http(s) with a host."""
    s = (link or "").strip() if isinstance(link, str) else ""
    if not s:
        return "", None
    if len(s) > RESUME_LINK_MAX_LEN:
        return None, f"Link must be at most {RESUME_LINK_MAX_LEN} characters"
    parsed = urlparse(s)
    if parsed.scheme not in ("http", "https"):
        return None, "Resume link must start with http:// or https://"
    if not parsed.netloc:
        return None, "Resume link is not a valid URL"
    return s, None


def _ensure_application_resume_upload_dir():
    os.makedirs(APPLICATION_RESUME_UPLOAD_DIR, exist_ok=True)


def _validate_optional_http_url(link, field_label="Link"):
    s = (link or "").strip() if isinstance(link, str) else ""
    if not s:
        return "", None
    normalized, err = _validate_resume_url(s)
    if err:
        return None, f"{field_label}: {err}"
    return normalized, None


def _save_application_resume_upload(file_storage):
    """Persist multipart PDF; returns (/api/uploads/application-resumes/<id>.pdf, None) or (None, error)."""
    if not file_storage or not getattr(file_storage, "filename", None):
        return None, "Resume PDF is missing."
    safe = secure_filename(file_storage.filename)
    if not safe.lower().endswith(".pdf"):
        return None, "Resume must be a PDF file (.pdf)."
    blob = file_storage.read()
    if len(blob) > MAX_APPLICATION_RESUME_BYTES:
        return None, "Resume file must be 5 MB or smaller."
    if not blob.startswith(b"%PDF"):
        return None, "Uploaded file is not a valid PDF."
    _ensure_application_resume_upload_dir()
    fname = f"{secrets.token_hex(16)}.pdf"
    path = os.path.join(APPLICATION_RESUME_UPLOAD_DIR, fname)
    with open(path, "wb") as out:
        out.write(blob)
    return f"/api/uploads/application-resumes/{fname}", None


def _parse_vacancy_application_payload():
    """Multipart (file and/or resume_url) or JSON (resume URL). Returns (dict, None) or (None, error str)."""
    ct = (request.content_type or "").lower()
    cover_letter = ""
    portfolio_norm = ""
    resume_val = None

    if "multipart/form-data" in ct:
        cover_letter = (request.form.get("cover_letter") or "").strip()
        portfolio_raw = (request.form.get("portfolio_link") or "").strip()
        pn, perr = _validate_optional_http_url(portfolio_raw, "Portfolio link")
        if perr:
            return None, perr
        portfolio_norm = pn

        f = request.files.get("resume")
        resume_url = (request.form.get("resume_url") or "").strip()
        if f and getattr(f, "filename", None):
            resume_val, err = _save_application_resume_upload(f)
            if err:
                return None, err
        elif resume_url:
            resume_val, err = _validate_resume_url(resume_url)
            if err:
                return None, err
        else:
            return None, "Provide a resume PDF or a resume_url (HTTPS link to your CV)."
    else:
        data = request.get_json(silent=True) or {}
        cover_letter = (data.get("cover_letter") or "").strip()
        portfolio_raw = (data.get("portfolio_link") or "").strip()
        pn, perr = _validate_optional_http_url(portfolio_raw, "Portfolio link")
        if perr:
            return None, perr
        portfolio_norm = pn

        resume_raw = (data.get("resume") or "").strip()
        if not resume_raw:
            return None, "resume is required (HTTPS URL to your résumé)."
        resume_val, err = _validate_resume_url(resume_raw)
        if err:
            return None, err

    if len(cover_letter) > 20000:
        return None, "Cover letter is too long (max 20000 characters)."

    resume_str = (resume_val or "").strip() if resume_val is not None else ""
    if not resume_str:
        return None, "Resume is required."

    return {
        "resume": resume_str,
        "cover_letter": cover_letter if cover_letter else None,
        "portfolio_link": portfolio_norm if portfolio_norm else None,
    }, None


@app.route("/api/me/resume", methods=["PATCH"])
@token_required
def me_resume_patch():
    """Linked students may set or clear their resume PDF URL."""
    if current_user_role() != "student":
        return jsonify({"error": "Students only"}), 403
    sid = g.current_user.student_id
    if not sid:
        return jsonify({"error": "No student profile linked to this account"}), 400
    student = db.session.get(Student, sid)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    data = request.get_json() or {}
    raw = data.get("resume_link", "")
    normalized, err = _validate_resume_url(raw)
    if err:
        return jsonify({"error": err}), 400
    student.resume_link = normalized or None
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    return jsonify({"resume_link": student.resume_link or ""})


# ══════════════════════════════════════════════════════════════════════════════
# COMPANIES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/companies")
@token_required
def companies_list():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)
    industry = request.args.get("industry", "")

    q = Company.query
    if industry:
        q = q.filter_by(industry=industry)

    pag = q.order_by(Company.name).paginate(page=page, per_page=per_page, error_out=False)
    industries = [r[0] for r in db.session.query(Company.industry).distinct().order_by(Company.industry).all() if r[0]]

    return jsonify({
        "items": [c.to_dict() for c in pag.items],
        "total": pag.total,
        "page": pag.page,
        "pages": pag.pages,
        "has_next": pag.has_next,
        "has_prev": pag.has_prev,
        "industries": industries,
    })


@app.route("/api/companies", methods=["POST"])
@admin_required
def companies_create():
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Company name is required"}), 400
    phone_norm, phone_err = normalize_india_phone(data.get("contact_phone", ""))
    if phone_err:
        return jsonify({"error": phone_err}), 400
    company = Company(
        name=data["name"].strip(),
        industry=data.get("industry", "").strip(),
        website=data.get("website", "").strip(),
        contact_person=data.get("contact_person", "").strip(),
        contact_email=data.get("contact_email", "").strip(),
        contact_phone=phone_norm,
        address=data.get("address", "").strip(),
        description=data.get("description", "").strip(),
    )
    db.session.add(company)
    try:
        db.session.commit()
        return jsonify(company.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/companies/<int:id>")
@token_required
def companies_get(id):
    company = db.session.get(Company, id)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    is_stu, vsid = student_data_scope()
    if is_stu:
        d = company.to_dict(include_relations=False)
        if vsid:
            d["internships"] = [i.to_dict() for i in company.internships if i.student_id == vsid]
            d["placements"] = [p.to_dict() for p in company.placements if p.student_id == vsid]
        else:
            d["internships"] = []
            d["placements"] = []
        return jsonify(d)
    return jsonify(company.to_dict(include_relations=True))


@app.route("/api/companies/<int:id>", methods=["PUT"])
@admin_required
def companies_update(id):
    company = db.session.get(Company, id)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    data = request.get_json() or {}
    for field in ["name", "industry", "website", "contact_person", "contact_email", "contact_phone", "address", "description"]:
        if field in data:
            val = data[field]
            if field == "contact_phone":
                norm, err = normalize_india_phone(val)
                if err:
                    return jsonify({"error": err}), 400
                val = norm
            else:
                val = val.strip() if isinstance(val, str) else val
            setattr(company, field, val)
    try:
        db.session.commit()
        return jsonify(company.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/companies/<int:id>", methods=["DELETE"])
@admin_required
def companies_delete(id):
    company = db.session.get(Company, id)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    db.session.delete(company)
    db.session.commit()
    return jsonify({"message": "Company deleted"})


def _vacancy_from_payload(data, company_id):
    """Validate JSON body for create/update; returns (error_message, None) or (None, dict of fields)."""
    if not isinstance(data, dict):
        return "Invalid JSON body", None
    job_title = (data.get("job_title") or "").strip()
    if not job_title:
        return "job_title is required", None
    role_type = (data.get("role_type") or "").strip().lower()
    if role_type not in Vacancy.ROLE_TYPES:
        return f"role_type must be one of: {', '.join(Vacancy.ROLE_TYPES)}", None
    department = (data.get("department") or "").strip()
    if not department:
        return "department is required", None
    kind = (data.get("compensation_kind") or "lpa").strip().lower()
    if kind not in Vacancy.COMPENSATION_KINDS:
        return f"compensation_kind must be one of: {', '.join(Vacancy.COMPENSATION_KINDS)}", None
    raw_val = data.get("compensation_value")
    compensation_value = None
    if raw_val is not None and raw_val != "":
        try:
            compensation_value = float(raw_val)
        except (TypeError, ValueError):
            return "compensation_value must be a number", None
    deadline = parse_date(data.get("application_deadline"))
    return None, {
        "company_id": company_id,
        "job_title": job_title,
        "role_type": role_type,
        "department": department,
        "compensation_value": compensation_value,
        "compensation_kind": kind,
        "application_deadline": deadline,
    }


def _vacancies_active_only(q):
    today = date.today()
    return q.filter(or_(Vacancy.application_deadline.is_(None), Vacancy.application_deadline >= today))


def _vacancy_rows_to_json(rows, include_my_application=False, include_company_name=False):
    """Serialize vacancy rows; optionally attach current user's application and company name."""
    uid = g.current_user.id
    apps_by_vid = {}
    if include_my_application and rows:
        vids = [v.id for v in rows]
        for a in Application.query.filter(Application.user_id == uid, Application.vacancy_id.in_(vids)).all():
            apps_by_vid[a.vacancy_id] = a
    out = []
    for v in rows:
        d = v.to_dict()
        if include_company_name and v.company:
            d["company_name"] = v.company.name
        if include_my_application:
            a = apps_by_vid.get(v.id)
            d["my_application"] = (
                {
                    "id": a.id,
                    "status": a.status,
                    "status_label": Application.STATUS_LABELS.get(a.status, a.status),
                }
                if a
                else None
            )
        out.append(d)
    return out


@app.route("/api/vacancies")
@token_required
def vacancies_board():
    """All companies: browse vacancies. Use active_only=1 to hide past deadlines (optional)."""
    role = current_user_role()
    role_type = (request.args.get("role_type") or "").strip().lower()
    active_only = request.args.get("active_only", "0").strip().lower() in ("1", "true", "yes")
    q = Vacancy.query.options(joinedload(Vacancy.company))
    if active_only:
        q = _vacancies_active_only(q)
    if role_type in Vacancy.ROLE_TYPES:
        q = q.filter(Vacancy.role_type == role_type)
    rows = q.order_by(Vacancy.created_at.desc()).all()
    include_my = role == "student"
    items = _vacancy_rows_to_json(rows, include_my_application=include_my, include_company_name=True)
    return jsonify({"items": items})


@app.route("/api/companies/<int:company_id>/vacancies")
@token_required
def vacancies_list(company_id):
    company = db.session.get(Company, company_id)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    q = Vacancy.query.filter_by(company_id=company_id).options(joinedload(Vacancy.company))
    role = current_user_role()
    active_only = request.args.get("active_only", "0").strip().lower() in ("1", "true", "yes")
    if active_only:
        q = _vacancies_active_only(q)
    rows = q.order_by(Vacancy.created_at.desc()).all()
    include_my = role == "student"
    items = _vacancy_rows_to_json(rows, include_my_application=include_my, include_company_name=False)
    return jsonify({"items": items})


@app.route("/api/companies/<int:company_id>/vacancies", methods=["POST"])
@admin_required
def vacancies_create(company_id):
    if not db.session.get(Company, company_id):
        return jsonify({"error": "Company not found"}), 404
    err, fields = _vacancy_from_payload(request.get_json() or {}, company_id)
    if err:
        return jsonify({"error": err}), 400
    v = Vacancy(**fields)
    db.session.add(v)
    try:
        db.session.commit()
        return jsonify(v.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/vacancies/<int:vacancy_id>", methods=["PUT"])
@admin_required
def vacancies_update(vacancy_id):
    v = db.session.get(Vacancy, vacancy_id)
    if not v:
        return jsonify({"error": "Vacancy not found"}), 404
    err, fields = _vacancy_from_payload(request.get_json() or {}, v.company_id)
    if err:
        return jsonify({"error": err}), 400
    for key, val in fields.items():
        setattr(v, key, val)
    try:
        db.session.commit()
        return jsonify(v.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/vacancies/<int:vacancy_id>", methods=["DELETE"])
@admin_required
def vacancies_delete(vacancy_id):
    v = db.session.get(Vacancy, vacancy_id)
    if not v:
        return jsonify({"error": "Vacancy not found"}), 404
    db.session.delete(v)
    try:
        db.session.commit()
        return jsonify({"message": "Vacancy deleted"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/uploads/application-resumes/<filename>")
@token_required
def download_application_resume(filename):
    """Serve uploaded application PDFs to the owning student or an admin."""
    if not filename or "/" in filename or "\\" in filename or ".." in filename:
        return jsonify({"error": "Invalid file"}), 400
    if not str(filename).lower().endswith(".pdf"):
        return jsonify({"error": "Invalid file"}), 400
    _ensure_application_resume_upload_dir()
    base = os.path.abspath(APPLICATION_RESUME_UPLOAD_DIR)
    fp = os.path.abspath(os.path.join(APPLICATION_RESUME_UPLOAD_DIR, filename))
    if not fp.startswith(base) or not os.path.isfile(fp):
        return jsonify({"error": "Not found"}), 404
    rel = f"/api/uploads/application-resumes/{filename}"
    if current_user_role() == "admin":
        return send_file(fp, mimetype="application/pdf", as_attachment=False, download_name=filename)
    owner = Application.query.filter(
        Application.user_id == g.current_user.id,
        Application.resume == rel,
    ).first()
    if not owner:
        return jsonify({"error": "Forbidden"}), 403
    return send_file(fp, mimetype="application/pdf", as_attachment=False, download_name=filename)


@app.route("/api/vacancies/<int:vacancy_id>/applications", methods=["POST"])
@token_required
def vacancy_submit_application(vacancy_id):
    if current_user_role() != "student":
        return jsonify({"error": "Students only"}), 403
    if not g.current_user.student_id:
        return jsonify({"error": "Student profile is not linked to this account."}), 400
    v = db.session.get(Vacancy, vacancy_id)
    if not v:
        return jsonify({"error": "Vacancy not found"}), 404
    today = date.today()
    if v.application_deadline is not None and v.application_deadline < today:
        return jsonify({"error": "This vacancy is no longer accepting applications."}), 400
    if Application.query.filter_by(user_id=g.current_user.id, vacancy_id=vacancy_id).first():
        return jsonify({"error": "You have already applied for this vacancy."}), 409
    payload, perr = _parse_vacancy_application_payload()
    if perr:
        return jsonify({"error": perr}), 400
    row = Application(
        user_id=g.current_user.id,
        vacancy_id=vacancy_id,
        status="applied",
        resume=payload["resume"],
        cover_letter=payload["cover_letter"],
        portfolio_link=payload["portfolio_link"],
    )
    db.session.add(row)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "You have already applied for this vacancy."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    loaded = (
        Application.query.options(joinedload(Application.vacancy).joinedload(Vacancy.company))
        .filter_by(id=row.id)
        .first()
    )
    return jsonify(loaded.to_dict(include_vacancy=True)), 201


@app.route("/api/me/applications")
@token_required
def me_applications_list():
    if current_user_role() != "student":
        return jsonify({"error": "Students only"}), 403
    rows = (
        Application.query.options(joinedload(Application.vacancy).joinedload(Vacancy.company))
        .filter_by(user_id=g.current_user.id)
        .order_by(Application.application_date.desc())
        .all()
    )
    return jsonify({"items": [r.to_dict(include_vacancy=True) for r in rows]})


@app.route("/api/applications/<int:application_id>", methods=["PATCH"])
@admin_required
def application_update_status(application_id):
    row = db.session.get(Application, application_id)
    if not row:
        return jsonify({"error": "Application not found"}), 404
    data = request.get_json() or {}
    st = (data.get("status") or "").strip().lower()
    if st not in Application.STATUSES:
        return jsonify({"error": f"status must be one of: {', '.join(Application.STATUSES)}"}), 400
    row.status = st
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    loaded = (
        Application.query.options(joinedload(Application.vacancy).joinedload(Vacancy.company))
        .filter_by(id=application_id)
        .first()
    )
    return jsonify(loaded.to_dict(include_vacancy=True))


# ══════════════════════════════════════════════════════════════════════════════
# INTERNSHIPS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/internships")
@token_required
def internships_list():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)
    status = request.args.get("status", "")
    company_id = request.args.get("company_id", "")

    q = Internship.query
    is_stu, vsid = student_data_scope()
    if is_stu:
        q = q.filter_by(student_id=vsid) if vsid else q.filter(sql_false())
    if status:
        q = q.filter_by(status=status)
    if company_id:
        q = q.filter_by(company_id=int(company_id))

    pag = q.order_by(Internship.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [i.to_dict() for i in pag.items],
        "total": pag.total,
        "page": pag.page,
        "pages": pag.pages,
        "has_next": pag.has_next,
        "has_prev": pag.has_prev,
        "statuses": Internship.STATUSES,
    })


@app.route("/api/internships", methods=["POST"])
@admin_required
def internships_create():
    data = request.get_json() or {}
    for f in ["student_id", "company_id", "title"]:
        if not data.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    st_in = (data.get("status") or "applied").strip()
    if st_in not in Internship.STATUSES:
        return jsonify({"error": f"status must be one of: {', '.join(Internship.STATUSES)}"}), 400
    internship = Internship(
        student_id=int(data["student_id"]),
        company_id=int(data["company_id"]),
        title=data["title"].strip(),
        description=data.get("description", "").strip(),
        start_date=parse_date(data.get("start_date")),
        end_date=parse_date(data.get("end_date")),
        stipend=float(data["stipend"]) if data.get("stipend") else 0,
        status=st_in,
        progress_notes=data.get("progress_notes", "").strip(),
    )
    db.session.add(internship)
    try:
        db.session.flush()
        stu = internship.student
        cname = internship.company.name if internship.company else "the company"
        if stu:
            _notify_student_in_app(
                stu.id,
                "internship_created",
                "New internship recorded",
                f"{internship.title} at {cname}.",
                f"/internships/{internship.id}",
            )
        db.session.commit()
        if stu:
            ia_subj, ia_body = internship_added_to_profile(
                student_name=stu.name, title=internship.title, company=cname
            )
            notify_student_by_email(app, stu, ia_subj, ia_body, "Internship create email")
        return jsonify(internship.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/internships/<int:id>")
@token_required
def internships_get(id):
    internship = db.session.get(Internship, id)
    if not internship:
        return jsonify({"error": "Internship not found"}), 404
    is_stu, vsid = student_data_scope()
    if is_stu and (not vsid or internship.student_id != vsid):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(internship.to_dict())


@app.route("/api/internships/<int:id>", methods=["PUT"])
@admin_required
def internships_update(id):
    internship = db.session.get(Internship, id)
    if not internship:
        return jsonify({"error": "Internship not found"}), 404
    data = request.get_json() or {}
    if "student_id" in data:
        internship.student_id = int(data["student_id"])
    if "company_id" in data:
        internship.company_id = int(data["company_id"])
    for field in ["title", "description", "progress_notes"]:
        if field in data:
            setattr(internship, field, data[field].strip() if data[field] else "")
    if "start_date" in data:
        internship.start_date = parse_date(data["start_date"])
    if "end_date" in data:
        internship.end_date = parse_date(data["end_date"])
    if "stipend" in data:
        internship.stipend = float(data["stipend"]) if data["stipend"] else 0
    old_status = internship.status
    if "status" in data:
        st = (data["status"] or "").strip()
        if st not in Internship.STATUSES:
            return jsonify({"error": f"status must be one of: {', '.join(Internship.STATUSES)}"}), 400
        internship.status = st
    try:
        db.session.commit()
        if "status" in data and internship.status != old_status:
            stu = internship.student
            if stu:
                cname = internship.company.name if internship.company else "the company"
                is_subj, is_body = internship_status_changed(
                    student_name=stu.name,
                    title=internship.title,
                    company=cname,
                    old_status=old_status,
                    new_status=internship.status,
                )
                notify_student_by_email(app, stu, is_subj, is_body, "Internship status email")
                _notify_student_in_app(
                    stu.id,
                    "internship_status",
                    "Internship status updated",
                    f'"{internship.title}" at {cname}: {old_status} → {internship.status}.',
                    f"/internships/{internship.id}",
                )
                db.session.commit()
        return jsonify(internship.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/internships/<int:id>", methods=["DELETE"])
@admin_required
def internships_delete(id):
    internship = db.session.get(Internship, id)
    if not internship:
        return jsonify({"error": "Internship not found"}), 404
    db.session.delete(internship)
    db.session.commit()
    return jsonify({"message": "Internship deleted"})


# ══════════════════════════════════════════════════════════════════════════════
# PLACEMENTS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/placements")
@token_required
def placements_list():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)
    status = request.args.get("status", "")
    company_id = request.args.get("company_id", "")

    q = Placement.query
    is_stu, vsid = student_data_scope()
    if is_stu:
        q = q.filter_by(student_id=vsid) if vsid else q.filter(sql_false())
    if status:
        q = q.filter_by(status=status)
    if company_id:
        q = q.filter_by(company_id=int(company_id))

    pag = q.order_by(Placement.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [p.to_dict() for p in pag.items],
        "total": pag.total,
        "page": pag.page,
        "pages": pag.pages,
        "has_next": pag.has_next,
        "has_prev": pag.has_prev,
        "statuses": Placement.STATUSES,
    })


@app.route("/api/placements", methods=["POST"])
@admin_required
def placements_create():
    data = request.get_json() or {}
    for f in ["student_id", "company_id", "role", "package_lpa"]:
        if not data.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    st = (data.get("status") or "applied").strip()
    if st not in Placement.STATUSES:
        return jsonify({"error": f"status must be one of: {', '.join(Placement.STATUSES)}"}), 400
    placement = Placement(
        student_id=int(data["student_id"]),
        company_id=int(data["company_id"]),
        role=data["role"].strip(),
        package_lpa=float(data["package_lpa"]),
        offer_date=parse_date(data.get("offer_date")),
        joining_date=parse_date(data.get("joining_date")),
        status=st,
    )
    db.session.add(placement)
    try:
        db.session.flush()
        stu = placement.student
        cname = placement.company.name if placement.company else "the company"
        if stu:
            _notify_student_in_app(
                stu.id,
                "placement_created",
                "New placement record",
                f"{placement.role} at {cname} ({placement.package_lpa} LPA).",
                f"/placements/{placement.id}",
            )
        db.session.commit()
        if stu:
            pa_subj, pa_body = placement_added_to_profile(
                student_name=stu.name,
                role=placement.role,
                company=cname,
                package_lpa=placement.package_lpa,
            )
            notify_student_by_email(app, stu, pa_subj, pa_body, "Placement create email")
        return jsonify(placement.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/placements/<int:id>")
@token_required
def placements_get(id):
    placement = db.session.get(Placement, id)
    if not placement:
        return jsonify({"error": "Placement not found"}), 404
    is_stu, vsid = student_data_scope()
    if is_stu and (not vsid or placement.student_id != vsid):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(placement.to_dict())


@app.route("/api/placements/<int:id>", methods=["PUT"])
@admin_required
def placements_update(id):
    placement = db.session.get(Placement, id)
    if not placement:
        return jsonify({"error": "Placement not found"}), 404
    data = request.get_json() or {}
    if "student_id" in data:
        placement.student_id = int(data["student_id"])
    if "company_id" in data:
        placement.company_id = int(data["company_id"])
    if "role" in data:
        placement.role = data["role"].strip()
    if "package_lpa" in data:
        placement.package_lpa = float(data["package_lpa"])
    if "offer_date" in data:
        placement.offer_date = parse_date(data["offer_date"])
    if "joining_date" in data:
        placement.joining_date = parse_date(data["joining_date"])
    old_status = placement.status
    if "status" in data:
        st = (data["status"] or "").strip()
        if st not in Placement.STATUSES:
            return jsonify({"error": f"status must be one of: {', '.join(Placement.STATUSES)}"}), 400
        placement.status = st
    try:
        db.session.commit()
        if "status" in data and placement.status != old_status:
            stu = placement.student
            if stu:
                cname = placement.company.name if placement.company else "the company"
                ps_subj, ps_body = placement_status_changed(
                    student_name=stu.name,
                    role=placement.role,
                    company=cname,
                    old_status=old_status,
                    new_status=placement.status,
                    package_lpa=placement.package_lpa,
                )
                notify_student_by_email(
                    app, stu, ps_subj, ps_body, f"Placement {placement.id} status email"
                )
                _notify_student_in_app(
                    stu.id,
                    "placement_status",
                    "Placement status updated",
                    f'"{placement.role}" at {cname}: {old_status} → {placement.status}.',
                    f"/placements/{placement.id}",
                )
                db.session.commit()
        return jsonify(placement.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/placements/<int:id>", methods=["DELETE"])
@admin_required
def placements_delete(id):
    placement = db.session.get(Placement, id)
    if not placement:
        return jsonify({"error": "Placement not found"}), 404
    db.session.delete(placement)
    db.session.commit()
    return jsonify({"message": "Placement deleted"})


# ══════════════════════════════════════════════════════════════════════════════
# APPEALS (student requests → admin accept / reject)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/appeals", methods=["POST"])
@token_required
def appeals_create():
    is_stu, vsid = student_data_scope()
    if not is_stu or not vsid:
        return jsonify({"error": "Only students can submit appeals"}), 403
    data = request.get_json() or {}
    appeal_type = (data.get("appeal_type") or "").strip().lower()
    if appeal_type not in Appeal.APPEAL_TYPES:
        return jsonify({"error": "appeal_type must be internship or placement"}), 400
    title = (data.get("title") or "").strip()
    company_id = data.get("company_id")
    if not title or company_id is None:
        return jsonify({"error": "company_id and title are required"}), 400
    try:
        cid = int(company_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid company_id"}), 400
    if not db.session.get(Company, cid):
        return jsonify({"error": "Company not found"}), 404

    message = (data.get("message") or "").strip() or None
    package_lpa = None
    if appeal_type == "placement":
        raw_pkg = data.get("package_lpa")
        if raw_pkg not in (None, ""):
            try:
                package_lpa = float(raw_pkg)
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid package_lpa"}), 400

    appeal = Appeal(
        student_id=vsid,
        company_id=cid,
        appeal_type=appeal_type,
        title=title,
        message=message,
        package_lpa=package_lpa,
    )
    db.session.add(appeal)
    try:
        db.session.flush()
        student = db.session.get(Student, vsid)
        company = db.session.get(Company, cid)
        if student and company:
            _notify_all_admins(
                "appeal_submitted",
                "New student appeal",
                f'{student.name} — {title} ({appeal_type}) at {company.name}.',
                "/appeals",
            )
        db.session.commit()
        if student:
            kind = "internship" if appeal_type == "internship" else "placement"
            cname = company.name if company else "the company"
            ar_subj, ar_body = appeal_received(
                student_name=student.name,
                kind=kind,
                company=cname,
                title=title,
                appeal_id=appeal.id,
            )
            notify_student_by_email(
                app, student, ar_subj, ar_body, "Appeal submitted confirmation"
            )
        return jsonify(appeal.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/appeals")
@token_required
def appeals_list():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status_filter = (request.args.get("status") or "").strip().lower()

    q = Appeal.query
    is_stu, vsid = student_data_scope()
    if is_stu:
        if not vsid:
            return jsonify({
                "items": [], "total": 0, "page": 1, "pages": 0,
                "has_next": False, "has_prev": False,
                "statuses": list(Appeal.STATUSES),
            })
        q = q.filter_by(student_id=vsid)
    if status_filter in Appeal.STATUSES:
        q = q.filter_by(status=status_filter)

    pag = q.order_by(Appeal.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [a.to_dict() for a in pag.items],
        "total": pag.total,
        "page": pag.page,
        "pages": pag.pages,
        "has_next": pag.has_next,
        "has_prev": pag.has_prev,
        "statuses": list(Appeal.STATUSES),
    })


@app.route("/api/appeals/<int:id>")
@token_required
def appeals_get(id):
    appeal = db.session.get(Appeal, id)
    if not appeal:
        return jsonify({"error": "Appeal not found"}), 404
    is_stu, vsid = student_data_scope()
    if is_stu:
        if not vsid or appeal.student_id != vsid:
            return jsonify({"error": "Forbidden"}), 403
    elif current_user_role() != "admin":
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(appeal.to_dict())


@app.route("/api/appeals/<int:id>/accept", methods=["POST"])
@admin_required
def appeals_accept(id):
    appeal = db.session.get(Appeal, id)
    if not appeal:
        return jsonify({"error": "Appeal not found"}), 404
    if appeal.status != "pending":
        return jsonify({"error": "Appeal is not pending"}), 400

    now = datetime.utcnow()
    try:
        if appeal.appeal_type == "internship":
            internship = Internship(
                student_id=appeal.student_id,
                company_id=appeal.company_id,
                title=appeal.title,
                description=appeal.message or "",
                status="applied",
                stipend=0,
            )
            db.session.add(internship)
            db.session.flush()
            appeal.result_internship_id = internship.id
        elif appeal.appeal_type == "placement":
            pkg = float(appeal.package_lpa) if appeal.package_lpa is not None else 0.0
            placement = Placement(
                student_id=appeal.student_id,
                company_id=appeal.company_id,
                role=appeal.title,
                package_lpa=pkg,
                status="applied",
            )
            db.session.add(placement)
            db.session.flush()
            appeal.result_placement_id = placement.id
        else:
            return jsonify({"error": "Invalid appeal type"}), 400

        appeal.status = "accepted"
        appeal.reviewed_at = now
        appeal.reviewer_user_id = g.current_user.id
        db.session.commit()
        stu = appeal.student
        if stu:
            kind = appeal.appeal_type
            cname = appeal.company.name if appeal.company else "the company"
            aa_subj, aa_body = appeal_accepted(
                student_name=stu.name,
                kind=kind,
                company=cname,
                title=appeal.title,
            )
            notify_student_by_email(app, stu, aa_subj, aa_body, "Appeal accepted email")
            _notify_student_in_app(
                stu.id,
                "appeal_accepted",
                "Appeal accepted",
                f'Your {kind} request "{appeal.title}" at {cname} was approved.',
                f"/appeals",
            )
            db.session.commit()
        return jsonify(appeal.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/appeals/<int:id>/reject", methods=["POST"])
@admin_required
def appeals_reject(id):
    appeal = db.session.get(Appeal, id)
    if not appeal:
        return jsonify({"error": "Appeal not found"}), 404
    if appeal.status != "pending":
        return jsonify({"error": "Appeal is not pending"}), 400
    data = request.get_json() or {}
    note = (data.get("admin_note") or "").strip() or None
    appeal.status = "rejected"
    appeal.admin_note = note
    appeal.reviewed_at = datetime.utcnow()
    appeal.reviewer_user_id = g.current_user.id
    try:
        db.session.commit()
        stu = appeal.student
        if stu:
            kind = appeal.appeal_type
            cname = appeal.company.name if appeal.company else "the company"
            rj_subj, rj_body = appeal_rejected(
                student_name=stu.name,
                kind=kind,
                company=cname,
                title=appeal.title,
                admin_note=note,
            )
            notify_student_by_email(app, stu, rj_subj, rj_body, "Appeal rejected email")
            _notify_student_in_app(
                stu.id,
                "appeal_rejected",
                "Appeal update",
                f'Your {kind} request "{appeal.title}" at {cname} was not approved.',
                "/appeals",
            )
            db.session.commit()
        return jsonify(appeal.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS (in-app)
# ══════════════════════════════════════════════════════════════════════════════


@app.route("/api/notifications")
@token_required
def notifications_list():
    limit = min(max(request.args.get("limit", 40, type=int), 1), 100)
    unread_only = (request.args.get("unread_only") or "").lower() in ("1", "true", "yes")
    q = Notification.query.filter_by(user_id=g.current_user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    rows = q.order_by(Notification.created_at.desc()).limit(limit).all()
    return jsonify({"items": [n.to_dict() for n in rows]})


@app.route("/api/notifications/unread-count")
@token_required
def notifications_unread_count():
    uid = g.current_user.id
    unread = (
        Notification.query.filter_by(user_id=uid)
        .filter(Notification.read_at.is_(None))
        .count()
    )
    # Admins: align the badge with actionable work — pending appeals must show even if no in-app
    # Notification row exists (e.g. appeal from before notifications shipped) or appeal rows were
    # read. Use DB pending count and avoid double-counting unread `appeal_submitted` notifications.
    if current_user_role() == "admin":
        ack = getattr(g.current_user, "notification_ack_at", None)
        pq = Appeal.query.filter_by(status="pending")
        if ack is not None:
            pq = pq.filter(Appeal.created_at > ack)
        pending = pq.count()
        appeal_unread = (
            Notification.query.filter_by(user_id=uid, kind="appeal_submitted")
            .filter(Notification.read_at.is_(None))
            .count()
        )
        n = max(0, unread - appeal_unread + pending)
    else:
        n = unread
    return jsonify({"count": n})


@app.route("/api/notifications/<int:nid>/read", methods=["PATCH"])
@token_required
def notifications_mark_read(nid):
    n = db.session.get(Notification, nid)
    if not n or n.user_id != g.current_user.id:
        return jsonify({"error": "Notification not found"}), 404
    if n.read_at is None:
        n.read_at = datetime.utcnow()
        db.session.commit()
    return jsonify(n.to_dict())


@app.route("/api/notifications/read-all", methods=["POST"])
@token_required
def notifications_mark_all_read():
    now = datetime.utcnow()
    rows = (
        Notification.query.filter_by(user_id=g.current_user.id)
        .filter(Notification.read_at.is_(None))
        .all()
    )
    for row in rows:
        row.read_at = now
    g.current_user.notification_ack_at = now
    db.session.commit()
    return jsonify({"ok": True, "updated": len(rows)})


@app.route("/api/notifications/acknowledge", methods=["POST"])
@token_required
def notifications_acknowledge():
    """Mark notification center as seen — resets badge (including admin pending-appeal indicator)."""
    g.current_user.notification_ack_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True})


# ══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/search")
@token_required
def search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"students": [], "companies": [], "internships": [], "placements": []})

    like = f"%{q}%"
    is_stu, vsid = student_data_scope()

    if not is_stu:
        students = [s.to_dict() for s in Student.query.filter(
            db.or_(Student.name.ilike(like), Student.roll_number.ilike(like),
                   Student.email.ilike(like), Student.department.ilike(like),
                   Student.course.ilike(like), Student.skills.ilike(like))
        ).limit(20).all()]
    else:
        students = []

    companies = [c.to_dict() for c in Company.query.filter(
        db.or_(Company.name.ilike(like), Company.industry.ilike(like), Company.contact_person.ilike(like))
    ).limit(20).all()]

    iq = Internship.query.join(Student).join(Company).filter(
        db.or_(Internship.title.ilike(like), Student.name.ilike(like), Company.name.ilike(like))
    )
    if is_stu and vsid:
        iq = iq.filter(Internship.student_id == vsid)
    elif is_stu:
        iq = iq.filter(sql_false())
    internships = [i.to_dict() for i in iq.limit(20).all()]

    pq = Placement.query.join(Student).join(Company).filter(
        db.or_(Placement.role.ilike(like), Student.name.ilike(like), Company.name.ilike(like))
    )
    if is_stu and vsid:
        pq = pq.filter(Placement.student_id == vsid)
    elif is_stu:
        pq = pq.filter(sql_false())
    placements = [p.to_dict() for p in pq.limit(20).all()]

    return jsonify({"students": students, "companies": companies,
                    "internships": internships, "placements": placements})


# ══════════════════════════════════════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/reports/me")
@token_required
def report_me():
    """Personal summary for students only (own internships, placements, appeals)."""
    is_stu, vsid = student_data_scope()
    if not is_stu or not vsid:
        return jsonify({"error": "This report is only available for student accounts"}), 403
    student = db.session.get(Student, vsid)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    internship_status_counts = {s: Internship.query.filter_by(student_id=vsid, status=s).count() for s in Internship.STATUSES}
    placement_status_counts = {s: Placement.query.filter_by(student_id=vsid, status=s).count() for s in Placement.STATUSES}
    appeal_counts = {s: Appeal.query.filter_by(student_id=vsid, status=s).count() for s in Appeal.STATUSES}

    return jsonify({
        "student": student.to_dict(),
        "internship_status_counts": internship_status_counts,
        "placement_status_counts": placement_status_counts,
        "appeal_counts": appeal_counts,
    })


@app.route("/api/reports/placement-summary")
@admin_required
def report_placement_summary():
    departments = db.session.query(Student.department).distinct().order_by(Student.department).all()
    rows = []
    for (dept,) in departments:
        total = Student.query.filter_by(department=dept).count()
        placed = Placement.query.join(Student).filter(Student.department == dept, Placement.status == "placed").count()
        pkgs = [p.package_lpa for p in Placement.query.join(Student).filter(
            Student.department == dept, Placement.status == "placed").all()]
        rows.append({
            "department": dept, "total_students": total, "placed": placed,
            "unplaced": total - placed,
            "percentage": round(placed / total * 100, 1) if total else 0,
            "avg_package": round(sum(pkgs) / len(pkgs), 2) if pkgs else 0,
            "max_package": max(pkgs) if pkgs else 0,
        })
    return jsonify(rows)


@app.route("/api/reports/internship-summary")
@admin_required
def report_internship_summary():
    departments = db.session.query(Student.department).distinct().order_by(Student.department).all()
    rows = []
    for (dept,) in departments:
        total = Student.query.filter_by(department=dept).count()
        with_intern = db.session.query(db.func.count(db.distinct(Internship.student_id))).join(Student).filter(
            Student.department == dept).scalar()
        completed = Internship.query.join(Student).filter(Student.department == dept, Internship.status == "completed").count()
        ongoing = Internship.query.join(Student).filter(Student.department == dept, Internship.status == "ongoing").count()
        rows.append({
            "department": dept, "total_students": total, "with_internship": with_intern,
            "completed": completed, "ongoing": ongoing,
            "percentage": round(with_intern / total * 100, 1) if total else 0,
        })
    return jsonify(rows)


@app.route("/api/reports/company-wise")
@admin_required
def report_company_wise():
    companies = Company.query.order_by(Company.name).all()
    rows = []
    for c in companies:
        intern_count = Internship.query.filter_by(company_id=c.id).count()
        place_count = Placement.query.filter_by(company_id=c.id).count()
        placed = Placement.query.filter_by(company_id=c.id, status="placed").count()
        pkgs = [p.package_lpa for p in Placement.query.filter_by(company_id=c.id, status="placed").all()]
        rows.append({
            "company_name": c.name, "industry": c.industry,
            "internships": intern_count, "placements": place_count, "placed": placed,
            "avg_package": round(sum(pkgs) / len(pkgs), 2) if pkgs else 0,
            "max_package": max(pkgs) if pkgs else 0,
        })
    return jsonify(rows)


@app.route("/api/reports/analytics")
@admin_required
def report_analytics():
    """Aggregated KPIs, department breakdowns, and top companies for the analytical reports dashboard."""
    p_agg = (
        db.session.query(
            func.count(Placement.id),
            func.avg(Placement.package_lpa),
            func.max(Placement.package_lpa),
            func.min(Placement.package_lpa),
        )
        .filter(Placement.status == "placed")
        .one()
    )
    n_placed = int(p_agg[0] or 0)
    avg_pkg = float(p_agg[1]) if p_agg[1] is not None else 0.0
    max_pkg = float(p_agg[2]) if p_agg[2] is not None else 0.0
    min_pkg = float(p_agg[3]) if p_agg[3] is not None else 0.0
    if n_placed == 0:
        avg_pkg = max_pkg = min_pkg = 0.0

    departments = (
        db.session.query(Student.department).distinct().order_by(Student.department).all()
    )
    placement_depts = []
    for (dept,) in departments:
        total = Student.query.filter_by(department=dept).count()
        placed = (
            Placement.query.join(Student)
            .filter(Student.department == dept, Placement.status == "placed")
            .count()
        )
        pct = round(placed / total * 100, 1) if total else 0
        placement_depts.append(
            {
                "department": dept,
                "total_students": total,
                "placed": placed,
                "rate_pct": pct,
            }
        )

    top_rec = (
        db.session.query(
            Company.name,
            func.count(Placement.id).label("hires"),
            func.avg(Placement.package_lpa).label("avg_pkg"),
        )
        .join(Placement, Placement.company_id == Company.id)
        .filter(Placement.status == "placed")
        .group_by(Company.id)
        .order_by(func.count(Placement.id).desc(), Company.name)
        .limit(10)
        .all()
    )
    top_recruiters = [
        {
            "company_name": name,
            "hires": int(hires or 0),
            "avg_package": round(float(apkg or 0), 3) if apkg is not None else 0.0,
        }
        for name, hires, apkg in top_rec
    ]

    n_intern = Internship.query.count()
    n_completed = Internship.query.filter_by(status="completed").count()
    n_ongoing = Internship.query.filter_by(status="ongoing").count()
    i_stip_avg = db.session.query(func.avg(Internship.stipend)).filter(Internship.stipend > 0).scalar()
    avg_stip = float(i_stip_avg) if i_stip_avg is not None else 0.0

    internship_depts = []
    for (dept,) in departments:
        total = Student.query.filter_by(department=dept).count()
        with_intern = (
            db.session.query(func.count(func.distinct(Internship.student_id)))
            .join(Student)
            .filter(Student.department == dept)
            .scalar()
        )
        completed = (
            Internship.query.join(Student)
            .filter(Student.department == dept, Internship.status == "completed")
            .count()
        )
        ongoing = (
            Internship.query.join(Student)
            .filter(Student.department == dept, Internship.status == "ongoing")
            .count()
        )
        wi = int(with_intern or 0)
        internship_depts.append(
            {
                "department": dept,
                "total_students": total,
                "with_internship": wi,
                "completed": completed,
                "ongoing": ongoing,
                "rate_pct": round(wi / total * 100, 1) if total else 0,
            }
        )

    top_hosts = (
        db.session.query(
            Company.name,
            func.count(Internship.id).label("icount"),
            func.avg(Internship.stipend).label("avg_stip"),
        )
        .join(Internship, Internship.company_id == Company.id)
        .group_by(Company.id)
        .order_by(func.count(Internship.id).desc(), Company.name)
        .limit(10)
        .all()
    )
    top_hosts_list = [
        {
            "company_name": name,
            "internships": int(ic or 0),
            "avg_stipend": round(float(avs or 0), 2) if avs is not None else 0.0,
        }
        for name, ic, avs in top_hosts
    ]

    return jsonify(
        {
            "placement": {
                "total_placed": n_placed,
                "avg_package": round(avg_pkg, 3) if n_placed else 0.0,
                "highest_package": round(max_pkg, 3) if n_placed else 0.0,
                "lowest_package": round(min_pkg, 3) if n_placed else 0.0,
                "departments": placement_depts,
                "top_recruiters": top_recruiters,
            },
            "internship": {
                "total_internships": n_intern,
                "completed": n_completed,
                "ongoing": n_ongoing,
                "avg_stipend": round(avg_stip, 2),
                "departments": internship_depts,
                "top_hosts": top_hosts_list,
            },
        }
    )


@app.route("/api/reports/export/<report_type>")
@admin_required
def report_export(report_type):
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active

    if report_type == "students":
        ws.title = "Students"
        ws.append(["ID", "Name", "Roll Number", "Email", "Phone", "Department", "Course", "Year", "CGPA", "Skills"])
        for s in Student.query.order_by(Student.name).all():
            ws.append([s.id, s.name, s.roll_number, s.email, s.phone, s.department, s.course, s.year, s.cgpa, s.skills])
    elif report_type == "companies":
        ws.title = "Companies"
        ws.append(["ID", "Name", "Industry", "Website", "Contact Person", "Contact Email", "Contact Phone"])
        for c in Company.query.order_by(Company.name).all():
            ws.append([c.id, c.name, c.industry, c.website, c.contact_person, c.contact_email, c.contact_phone])
    elif report_type == "internships":
        ws.title = "Internships"
        ws.append(["ID", "Student", "Roll No", "Company", "Title", "Start Date", "End Date", "Stipend", "Status"])
        for i in Internship.query.all():
            ws.append([i.id, i.student.name, i.student.roll_number, i.company.name, i.title,
                       str(i.start_date or ""), str(i.end_date or ""), i.stipend, i.status])
    elif report_type == "placements":
        ws.title = "Placements"
        ws.append(["ID", "Student", "Roll No", "Company", "Role", "Package (LPA)", "Offer Date", "Joining Date", "Status"])
        for p in Placement.query.all():
            ws.append([p.id, p.student.name, p.student.roll_number, p.company.name, p.role,
                       p.package_lpa, str(p.offer_date or ""), str(p.joining_date or ""), p.status])
    elif report_type == "placement-summary":
        ws.title = "Placement Summary"
        ws.append(["Department", "Total Students", "Placed", "Unplaced", "Placement %", "Avg Package", "Max Package"])
        for (dept,) in db.session.query(Student.department).distinct().order_by(Student.department).all():
            total = Student.query.filter_by(department=dept).count()
            placed = Placement.query.join(Student).filter(Student.department == dept, Placement.status == "placed").count()
            pkgs = [p.package_lpa for p in Placement.query.join(Student).filter(Student.department == dept, Placement.status == "placed").all()]
            ws.append([dept, total, placed, total - placed,
                       round(placed / total * 100, 1) if total else 0,
                       round(sum(pkgs) / len(pkgs), 2) if pkgs else 0, max(pkgs) if pkgs else 0])
    else:
        return jsonify({"error": "Unknown report type"}), 400

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"{report_type}_report_{date.today().isoformat()}.xlsx"
    return send_file(buf, download_name=filename, as_attachment=True,
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ── Dropdown data endpoints ───────────────────────────────────────────────────

@app.route("/api/options/students")
@token_required
def options_students():
    is_stu, vsid = student_data_scope()
    if is_stu:
        if not vsid:
            return jsonify([])
        s = db.session.get(Student, vsid)
        if not s:
            return jsonify([])
        return jsonify([{"id": s.id, "name": s.name, "roll_number": s.roll_number}])
    students = Student.query.order_by(Student.name).all()
    return jsonify([{"id": s.id, "name": s.name, "roll_number": s.roll_number} for s in students])


@app.route("/api/options/companies")
@token_required
def options_companies():
    companies = Company.query.order_by(Company.name).all()
    return jsonify([{"id": c.id, "name": c.name} for c in companies])


# ══════════════════════════════════════════════════════════════════════════════
# SERVE REACT FRONTEND (production)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    full = os.path.join(STATIC_FOLDER, path)
    if path and os.path.isfile(full):
        return send_from_directory(STATIC_FOLDER, path)
    index = os.path.join(STATIC_FOLDER, "index.html")
    if os.path.isfile(index):
        return send_from_directory(STATIC_FOLDER, "index.html")
    return jsonify({"message": "PlaceTrack API is running. Deploy the frontend to static_frontend/."}), 200


# ══════════════════════════════════════════════════════════════════════════════
# INIT & RUN
# ══════════════════════════════════════════════════════════════════════════════

def init_db():
    with app.app_context():
        _ensure_db_schema()
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", email="admin@placetrack.edu", role="admin")
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print("Default admin created: admin / admin123")


def _ensure_appeals_table():
    try:
        inspector = sa_inspect(db.engine)
        if "appeals" not in inspector.get_table_names():
            Appeal.__table__.create(db.engine, checkfirst=True)
            print("PlaceTrack: created missing table 'appeals'")
    except Exception as ex:
        print("PlaceTrack: appeals schema check:", ex)


def _ensure_users_password_reset_columns():
    """Add password-reset columns to existing DBs (create_all does not alter old tables)."""
    inspector = sa_inspect(db.engine)
    users_table = next((t for t in inspector.get_table_names() if t.lower() == "users"), None)
    if not users_table:
        return
    qtbl = db.engine.dialect.identifier_preparer.quote(users_table)
    col_names = {c["name"] for c in inspector.get_columns(users_table)}
    if "password_reset_token_hash" not in col_names:
        with db.engine.begin() as conn:
            conn.execute(
                text(f"ALTER TABLE {qtbl} ADD COLUMN password_reset_token_hash VARCHAR(128) NULL")
            )
        print("PlaceTrack: added column users.password_reset_token_hash")
        col_names = {c["name"] for c in sa_inspect(db.engine).get_columns(users_table)}
    if "password_reset_expires" not in col_names:
        # PostgreSQL has no DATETIME; use TIMESTAMP (matches SQLAlchemy DateTime on PG).
        expires_type = "TIMESTAMP" if db.engine.dialect.name == "postgresql" else "DATETIME"
        with db.engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {qtbl} ADD COLUMN password_reset_expires {expires_type} NULL"))
        print("PlaceTrack: added column users.password_reset_expires")


def _ensure_users_notification_ack_at_column():
    inspector = sa_inspect(db.engine)
    users_table = next((t for t in inspector.get_table_names() if t.lower() == "users"), None)
    if not users_table:
        return
    qtbl = db.engine.dialect.identifier_preparer.quote(users_table)
    col_names = {c["name"] for c in inspector.get_columns(users_table)}
    if "notification_ack_at" in col_names:
        return
    ack_type = "TIMESTAMP" if db.engine.dialect.name == "postgresql" else "DATETIME"
    with db.engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {qtbl} ADD COLUMN notification_ack_at {ack_type} NULL"))
    print("PlaceTrack: added column users.notification_ack_at")


def _ensure_notifications_table():
    try:
        inspector = sa_inspect(db.engine)
        if "notifications" not in inspector.get_table_names():
            Notification.__table__.create(db.engine, checkfirst=True)
            print("PlaceTrack: created missing table 'notifications'")
    except Exception as ex:
        print("PlaceTrack: notifications schema check:", ex)


def _ensure_vacancies_table():
    try:
        inspector = sa_inspect(db.engine)
        if "vacancies" not in inspector.get_table_names():
            Vacancy.__table__.create(db.engine, checkfirst=True)
            print("PlaceTrack: created missing table 'vacancies'")
    except Exception as ex:
        print("PlaceTrack: vacancies schema check:", ex)


def _ensure_vacancy_applications_table():
    try:
        inspector = sa_inspect(db.engine)
        if "vacancy_applications" not in inspector.get_table_names():
            Application.__table__.create(db.engine, checkfirst=True)
            print("PlaceTrack: created missing table 'vacancy_applications'")
    except Exception as ex:
        print("PlaceTrack: vacancy_applications schema check:", ex)


def _ensure_application_detail_columns():
    """Add resume / cover_letter / portfolio_link to vacancy_applications on legacy DBs."""
    try:
        inspector = sa_inspect(db.engine)
        tname = next((t for t in inspector.get_table_names() if t.lower() == "vacancy_applications"), None)
        if not tname:
            return
        qtbl = db.engine.dialect.identifier_preparer.quote(tname)
        col_names = {c["name"].lower() for c in inspector.get_columns(tname)}
        with db.engine.begin() as conn:
            if "resume" not in col_names:
                conn.execute(
                    text(f"ALTER TABLE {qtbl} ADD COLUMN resume VARCHAR(2048) NOT NULL DEFAULT ''")
                )
                print("PlaceTrack: added vacancy_applications.resume")
                col_names.add("resume")
            if "cover_letter" not in col_names:
                ct = "TEXT"
                conn.execute(text(f"ALTER TABLE {qtbl} ADD COLUMN cover_letter {ct} NULL"))
                print("PlaceTrack: added vacancy_applications.cover_letter")
            if "portfolio_link" not in col_names:
                conn.execute(
                    text(f"ALTER TABLE {qtbl} ADD COLUMN portfolio_link VARCHAR(2048) NULL")
                )
                print("PlaceTrack: added vacancy_applications.portfolio_link")
    except Exception as ex:
        print("PlaceTrack: vacancy_applications detail columns:", ex)


def _ensure_students_course_column():
    inspector = sa_inspect(db.engine)
    students_table = next((t for t in inspector.get_table_names() if t.lower() == "students"), None)
    if not students_table:
        return
    qtbl = db.engine.dialect.identifier_preparer.quote(students_table)
    col_names = {c["name"] for c in inspector.get_columns(students_table)}
    if "course" in col_names:
        return
    with db.engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {qtbl} ADD COLUMN course VARCHAR(200) NOT NULL DEFAULT ''"))
    print("PlaceTrack: added column students.course")


def _ensure_db_schema():
    """Create all tables; migrate legacy schemas."""
    db.create_all()
    _ensure_appeals_table()
    _ensure_notifications_table()
    _ensure_vacancies_table()
    _ensure_vacancy_applications_table()
    _ensure_application_detail_columns()
    _ensure_application_resume_upload_dir()
    _ensure_users_password_reset_columns()
    _ensure_users_notification_ack_at_column()
    _ensure_students_course_column()


with app.app_context():
    _ensure_db_schema()
    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", email="admin@placetrack.edu", role="admin")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)
