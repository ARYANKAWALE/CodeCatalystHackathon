"""Add 10 new students to an existing database."""
from app import app, db
from models import Student

SEED_DEPT_TO_COURSE = {
    "Computer Science": "Computer Science and Engineering (CSE)",
    "Electronics": "Electronics and Telecommunication Engineering (ETC)",
    "Mechanical": "Mechanical Engineering",
    "Information Technology": "Information Technology (IT)",
    "Electrical": "Electrical Engineering",
    "Civil": "Civil Engineering",
}

NEW_STUDENTS = [
    ("Tanvi Kulkarni", "CS2022016", "tanvi.kulkarni@college.edu", "9876543225", "Computer Science", 3, 8.8, "Python, FastAPI, Docker"),
    ("Harsh Agarwal", "EC2022017", "harsh.agarwal@college.edu", "9876543226", "Electronics", 2, 7.4, "VHDL, FPGA, Verilog"),
    ("Riya Saxena", "IT2022018", "riya.saxena@college.edu", "9876543227", "Information Technology", 4, 8.5, "React, Redux, GraphQL"),
    ("Karan Malhotra", "ME2022019", "karan.malhotra@college.edu", "9876543228", "Mechanical", 3, 7.7, "FEA, Ansys, SolidWorks"),
    ("Pooja Hegde", "CS2023020", "pooja.hegde@college.edu", "9876543229", "Computer Science", 2, 9.3, "Data Science, Pandas, SQL"),
    ("Amit Tiwari", "EE2023021", "amit.tiwari@college.edu", "9876543230", "Electrical", 2, 7.1, "Power Systems, PLC, SCADA"),
    ("Neha Sharma", "CS2023022", "neha.sharma@college.edu", "9876543231", "Computer Science", 1, 8.4, "C++, OOP, DSA"),
    ("Raj Patel", "IT2023023", "raj.patel@college.edu", "9876543232", "Information Technology", 3, 8.1, "DevOps, Jenkins, AWS"),
    ("Simran Kaur", "CE2023024", "simran.kaur@college.edu", "9876543233", "Civil", 2, 7.9, "AutoCAD, Revit, Staad Pro"),
    ("Deepak Choudhary", "EE2023025", "deepak.choudhary@college.edu", "9876543234", "Electrical", 3, 7.3, "Arduino, Embedded C, IoT"),
]

with app.app_context():
    added = 0
    for name, roll, email, phone, dept, year, cgpa, skills in NEW_STUDENTS:
        if Student.query.filter_by(roll_number=roll).first():
            print(f"  Skipping {name} ({roll}) — already exists")
            continue
        course = SEED_DEPT_TO_COURSE.get(dept, "Computer Science and Engineering (CSE)")
        db.session.add(Student(
            name=name, roll_number=roll, email=email, phone=phone,
            department=dept, course=course, year=year, cgpa=cgpa, skills=skills,
        ))
        added += 1
        print(f"  Added {name} ({roll})")
    db.session.commit()
    print(f"\nDone — {added} new students added.")
