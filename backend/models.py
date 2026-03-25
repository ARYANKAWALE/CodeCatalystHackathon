from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class Appeal(db.Model):
    """Student request to pursue an internship or placement with a company; admin accepts or rejects."""

    __tablename__ = "appeals"
    APPEAL_TYPES = ("internship", "placement")
    STATUSES = ("pending", "accepted", "rejected")

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    appeal_type = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text)
    package_lpa = db.Column(db.Float)
    status = db.Column(db.String(20), nullable=False, default="pending")
    admin_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)
    reviewer_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    result_internship_id = db.Column(db.Integer, db.ForeignKey("internships.id"), nullable=True)
    result_placement_id = db.Column(db.Integer, db.ForeignKey("placements.id"), nullable=True)

    reviewer = db.relationship("User", foreign_keys=[reviewer_user_id], backref="reviewed_appeals")
    result_internship = db.relationship("Internship", foreign_keys=[result_internship_id])
    result_placement = db.relationship("Placement", foreign_keys=[result_placement_id])

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "company_id": self.company_id,
            "appeal_type": self.appeal_type,
            "title": self.title,
            "message": self.message,
            "package_lpa": self.package_lpa,
            "status": self.status,
            "admin_note": self.admin_note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reviewer_user_id": self.reviewer_user_id,
            "result_internship_id": self.result_internship_id,
            "result_placement_id": self.result_placement_id,
            "student_name": self.student.name if self.student else None,
            "student_roll": self.student.roll_number if self.student else None,
            "company_name": self.company.name if self.company else None,
        }


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="admin")
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    password_reset_token_hash = db.Column(db.String(128), nullable=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)

    student = db.relationship("Student", backref="user_account", uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "student_id": self.student_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    roll_number = db.Column(db.String(30), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15))
    department = db.Column(db.String(80), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    cgpa = db.Column(db.Float)
    skills = db.Column(db.Text)
    resume_link = db.Column(db.String(2048))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    internships = db.relationship("Internship", backref="student", lazy=True, cascade="all, delete-orphan")
    placements = db.relationship("Placement", backref="student", lazy=True, cascade="all, delete-orphan")
    appeals = db.relationship("Appeal", backref="student", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_relations=False):
        d = {
            "id": self.id,
            "name": self.name,
            "roll_number": self.roll_number,
            "email": self.email,
            "phone": self.phone,
            "department": self.department,
            "year": self.year,
            "cgpa": self.cgpa,
            "skills": self.skills,
            "resume_link": self.resume_link,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_relations:
            d["internships"] = [i.to_dict() for i in self.internships]
            d["placements"] = [p.to_dict() for p in self.placements]
        return d


class Company(db.Model):
    __tablename__ = "companies"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    industry = db.Column(db.String(100))
    website = db.Column(db.String(200))
    contact_person = db.Column(db.String(120))
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(15))
    address = db.Column(db.Text)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    internships = db.relationship("Internship", backref="company", lazy=True, cascade="all, delete-orphan")
    placements = db.relationship("Placement", backref="company", lazy=True, cascade="all, delete-orphan")
    appeals = db.relationship("Appeal", backref="company", lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_relations=False):
        d = {
            "id": self.id,
            "name": self.name,
            "industry": self.industry,
            "website": self.website,
            "contact_person": self.contact_person,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_relations:
            d["internships"] = [i.to_dict() for i in self.internships]
            d["placements"] = [p.to_dict() for p in self.placements]
        return d


class Internship(db.Model):
    __tablename__ = "internships"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    stipend = db.Column(db.Float, default=0)
    status = db.Column(db.String(30), nullable=False, default="applied")
    progress_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    STATUSES = ["applied", "selected", "ongoing", "completed", "rejected"]

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "company_id": self.company_id,
            "title": self.title,
            "description": self.description,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "stipend": self.stipend,
            "status": self.status,
            "progress_notes": self.progress_notes,
            "student_name": self.student.name if self.student else None,
            "student_roll": self.student.roll_number if self.student else None,
            "company_name": self.company.name if self.company else None,
            "duration_days": (self.end_date - self.start_date).days if self.start_date and self.end_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Placement(db.Model):
    __tablename__ = "placements"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    role = db.Column(db.String(150), nullable=False)
    package_lpa = db.Column(db.Float, nullable=False)
    offer_date = db.Column(db.Date)
    joining_date = db.Column(db.Date)
    status = db.Column(db.String(30), nullable=False, default="applied")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    STATUSES = ["applied", "shortlisted", "selected", "placed", "rejected"]

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "company_id": self.company_id,
            "role": self.role,
            "package_lpa": self.package_lpa,
            "offer_date": self.offer_date.isoformat() if self.offer_date else None,
            "joining_date": self.joining_date.isoformat() if self.joining_date else None,
            "status": self.status,
            "student_name": self.student.name if self.student else None,
            "student_roll": self.student.roll_number if self.student else None,
            "company_name": self.company.name if self.company else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
