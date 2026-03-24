import io
import os
from datetime import datetime, date, timedelta, timezone
from functools import wraps

import jwt
from flask import Flask, jsonify, request, send_file, send_from_directory, g
from flask_cors import CORS
from sqlalchemy import false as sql_false

from config import Config
from models import db, User, Student, Company, Internship, Placement

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "static_frontend")

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path="")
app.config.from_object(Config)

CORS(app, resources={r"/api/*": {"origins": "*"}}, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
db.init_app(app)

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
            g.current_user = db.session.get(User, data["user_id"])
            if not g.current_user:
                return jsonify({"error": "User not found"}), 401
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
        if g.current_user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def student_data_scope():
    """(is_student_role, student_id). Admins get (False, None). Students without a linked row get (True, None)."""
    u = g.current_user
    if u.role != "student":
        return (False, None)
    return (True, u.student_id)


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
        year = data.get("year")
        if not roll_number or not name or not department or not year:
            return jsonify({"error": "Student registration requires name, roll_number, department, and year"}), 400
        if Student.query.filter_by(roll_number=roll_number).first():
            return jsonify({"error": "Roll number already exists"}), 409
        if Student.query.filter_by(email=email).first():
            return jsonify({"error": "A student with this email already exists"}), 409
        student = Student(
            name=name, roll_number=roll_number, email=email,
            department=department, year=int(year),
            phone=data.get("phone", "").strip(),
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
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401
    token = create_token(user)
    return jsonify({"token": token, "user": user.to_dict()})


@app.route("/api/auth/me")
@token_required
def auth_me():
    return jsonify({"user": g.current_user.to_dict()})


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard")
@token_required
def dashboard():
    if g.current_user.role == "student" and g.current_user.student_id:
        student = db.session.get(Student, g.current_user.student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        return jsonify({
            "type": "student",
            "student": student.to_dict(include_relations=True),
        })

    total_students = Student.query.count()
    total_companies = Company.query.count()
    total_internships = Internship.query.count()
    total_placements = Placement.query.count()
    active_internships = Internship.query.filter_by(status="ongoing").count()
    completed_internships = Internship.query.filter_by(status="completed").count()
    placed_count = Placement.query.filter_by(status="placed").count()

    placed = Placement.query.filter_by(status="placed").all()
    avg_package = round(sum(p.package_lpa for p in placed) / len(placed), 2) if placed else 0
    highest_package = max((p.package_lpa for p in placed), default=0)

    dept_stats = db.session.query(
        Student.department, db.func.count(Student.id)
    ).group_by(Student.department).all()

    internship_status_counts = {s: Internship.query.filter_by(status=s).count() for s in Internship.STATUSES}
    placement_status_counts = {s: Placement.query.filter_by(status=s).count() for s in Placement.STATUSES}

    recent_placements = [p.to_dict() for p in Placement.query.order_by(Placement.created_at.desc()).limit(5).all()]
    recent_internships = [i.to_dict() for i in Internship.query.order_by(Internship.created_at.desc()).limit(5).all()]

    return jsonify({
        "type": "admin",
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
        "recent_placements": recent_placements,
        "recent_internships": recent_internships,
    })


# ══════════════════════════════════════════════════════════════════════════════
# STUDENTS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/students")
@token_required
def students_list():
    if g.current_user.role == "student":
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
    required = ["name", "roll_number", "email", "department", "year"]
    for f in required:
        if not data.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    student = Student(
        name=data["name"].strip(),
        roll_number=data["roll_number"].strip(),
        email=data["email"].strip(),
        phone=data.get("phone", "").strip(),
        department=data["department"].strip(),
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
    for field in ["name", "roll_number", "email", "department", "year", "phone", "cgpa", "skills", "resume_link"]:
        if field in data:
            val = data[field]
            if field == "year":
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
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student deleted"})


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
    company = Company(
        name=data["name"].strip(),
        industry=data.get("industry", "").strip(),
        website=data.get("website", "").strip(),
        contact_person=data.get("contact_person", "").strip(),
        contact_email=data.get("contact_email", "").strip(),
        contact_phone=data.get("contact_phone", "").strip(),
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
            setattr(company, field, data[field].strip() if isinstance(data[field], str) else data[field])
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
    internship = Internship(
        student_id=int(data["student_id"]),
        company_id=int(data["company_id"]),
        title=data["title"].strip(),
        description=data.get("description", "").strip(),
        start_date=parse_date(data.get("start_date")),
        end_date=parse_date(data.get("end_date")),
        stipend=float(data["stipend"]) if data.get("stipend") else 0,
        status=data.get("status", "applied"),
        progress_notes=data.get("progress_notes", "").strip(),
    )
    db.session.add(internship)
    try:
        db.session.commit()
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
    if "status" in data:
        internship.status = data["status"]
    try:
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
    placement = Placement(
        student_id=int(data["student_id"]),
        company_id=int(data["company_id"]),
        role=data["role"].strip(),
        package_lpa=float(data["package_lpa"]),
        offer_date=parse_date(data.get("offer_date")),
        joining_date=parse_date(data.get("joining_date")),
        status=data.get("status", "applied"),
    )
    db.session.add(placement)
    try:
        db.session.commit()
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
    if "status" in data:
        placement.status = data["status"]
    try:
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
                   Student.email.ilike(like), Student.department.ilike(like), Student.skills.ilike(like))
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


@app.route("/api/reports/export/<report_type>")
@admin_required
def report_export(report_type):
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active

    if report_type == "students":
        ws.title = "Students"
        ws.append(["ID", "Name", "Roll Number", "Email", "Phone", "Department", "Year", "CGPA", "Skills"])
        for s in Student.query.order_by(Student.name).all():
            ws.append([s.id, s.name, s.roll_number, s.email, s.phone, s.department, s.year, s.cgpa, s.skills])
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
        db.create_all()
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", email="admin@placetrack.edu", role="admin")
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print("Default admin created: admin / admin123")


with app.app_context():
    db.create_all()
    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", email="admin@placetrack.edu", role="admin")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)
