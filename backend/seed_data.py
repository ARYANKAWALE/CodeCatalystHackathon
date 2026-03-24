"""Populate the MySQL database with sample data."""
from datetime import date
from app import app, db, init_db
from models import User, Student, Company, Internship, Placement

STUDENTS = [
    ("Aarav Sharma", "CS2021001", "aarav.sharma@college.edu", "9876543210", "Computer Science", 4, 8.9, "Python, Java, Machine Learning"),
    ("Priya Patel", "CS2021002", "priya.patel@college.edu", "9876543211", "Computer Science", 4, 9.2, "React, Node.js, MongoDB"),
    ("Rohan Gupta", "EC2021003", "rohan.gupta@college.edu", "9876543212", "Electronics", 4, 7.8, "Embedded Systems, VLSI, C++"),
    ("Sneha Reddy", "ME2021004", "sneha.reddy@college.edu", "9876543213", "Mechanical", 4, 8.1, "AutoCAD, SolidWorks, MATLAB"),
    ("Arjun Kumar", "CS2021005", "arjun.kumar@college.edu", "9876543214", "Computer Science", 3, 8.5, "Django, Flask, PostgreSQL"),
    ("Meera Nair", "IT2021006", "meera.nair@college.edu", "9876543215", "Information Technology", 4, 8.7, "Angular, TypeScript, AWS"),
    ("Vikram Singh", "EC2021007", "vikram.singh@college.edu", "9876543216", "Electronics", 3, 7.5, "PCB Design, Arduino, IoT"),
    ("Ananya Joshi", "CS2021008", "ananya.joshi@college.edu", "9876543217", "Computer Science", 4, 9.0, "AI, Deep Learning, TensorFlow"),
    ("Rahul Verma", "ME2021009", "rahul.verma@college.edu", "9876543218", "Mechanical", 3, 7.2, "Thermodynamics, CFD, Ansys"),
    ("Kavya Iyer", "IT2021010", "kavya.iyer@college.edu", "9876543219", "Information Technology", 4, 8.3, "Java, Spring Boot, Microservices"),
    ("Aditya Menon", "CS2022011", "aditya.menon@college.edu", "9876543220", "Computer Science", 3, 8.6, "Rust, Go, Kubernetes"),
    ("Divya Kapoor", "EC2022012", "divya.kapoor@college.edu", "9876543221", "Electronics", 3, 7.9, "Signal Processing, MATLAB"),
    ("Siddharth Rao", "IT2022013", "siddharth.rao@college.edu", "9876543222", "Information Technology", 3, 8.0, "Flutter, Dart, Firebase"),
    ("Ishita Bhat", "CS2022014", "ishita.bhat@college.edu", "9876543223", "Computer Science", 2, 9.1, "C, Data Structures, Algorithms"),
    ("Nikhil Desai", "ME2022015", "nikhil.desai@college.edu", "9876543224", "Mechanical", 2, 7.6, "3D Printing, CAD"),
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

COMPANIES = [
    ("Tata Consultancy Services", "IT Services", "https://www.tcs.com", "Rajesh Mehta", "rajesh.mehta@tcs.com", "9000100001", "TCS House, Mumbai", "Leading global IT services company."),
    ("Infosys", "IT Services", "https://www.infosys.com", "Sunita Rao", "sunita.rao@infosys.com", "9000100002", "Infosys Campus, Bangalore", "Digital services and consulting."),
    ("Wipro", "IT Services", "https://www.wipro.com", "Anil Kapoor", "anil.kapoor@wipro.com", "9000100003", "Wipro Ltd, Bangalore", "Technology services and consulting."),
    ("Google India", "Technology", "https://www.google.co.in", "Meena Iyer", "meena.iyer@google.com", "9000100004", "Google Office, Hyderabad", "Global technology giant."),
    ("Microsoft India", "Technology", "https://www.microsoft.com", "Ravi Shankar", "ravi.shankar@microsoft.com", "9000100005", "Microsoft Campus, Hyderabad", "Software and cloud solutions."),
    ("Amazon India", "E-Commerce / Technology", "https://www.amazon.in", "Neha Gupta", "neha.gupta@amazon.com", "9000100006", "Amazon Tower, Bangalore", "E-commerce and cloud computing."),
    ("Bosch India", "Manufacturing / Engineering", "https://www.bosch.in", "Klaus Mueller", "klaus.mueller@bosch.com", "9000100007", "Bosch Campus, Bangalore", "Engineering and technology company."),
    ("L&T Technology Services", "Engineering Services", "https://www.ltts.com", "Suresh Nair", "suresh.nair@ltts.com", "9000100008", "L&T House, Mumbai", "Engineering R&D services."),
]

INTERNSHIPS = [
    (1, 4, "Machine Learning Intern", "Work on NLP models", "2025-05-01", "2025-07-31", 50000, "completed", "Completed sentiment analysis project"),
    (2, 5, "Frontend Developer Intern", "Build React dashboards", "2025-06-01", "2025-08-31", 60000, "completed", "Delivered 3 dashboard modules"),
    (3, 7, "Embedded Systems Intern", "IoT sensor development", "2025-05-15", "2025-08-15", 25000, "completed", "Designed sensor interfacing board"),
    (4, 8, "Mechanical Design Intern", "CAD modeling", "2025-06-01", "2025-08-31", 20000, "completed", "Completed gearbox design"),
    (5, 1, "Backend Developer Intern", "API development with Flask", "2026-01-10", "2026-04-10", 30000, "ongoing", "Working on REST APIs"),
    (6, 2, "Cloud Engineering Intern", "AWS infrastructure", "2026-01-15", "2026-04-15", 40000, "ongoing", "Setting up CI/CD pipelines"),
    (7, 7, "IoT Development Intern", "Smart home prototyping", "2026-02-01", "2026-05-01", 20000, "ongoing", "Building prototype"),
    (8, 6, "AI Research Intern", "Computer vision research", "2025-05-01", "2025-10-31", 80000, "completed", "Published research paper"),
    (10, 3, "Java Developer Intern", "Spring Boot microservices", "2026-01-05", "2026-04-05", 35000, "ongoing", "Developing payment module"),
    (11, 4, "DevOps Intern", "Kubernetes cluster management", "2025-06-01", "2025-08-31", 45000, "completed", "Automated deployment pipeline"),
    (12, 7, "Signal Processing Intern", "Audio processing R&D", "2026-02-01", "2026-04-30", 22000, "applied", ""),
    (13, 6, "Mobile App Developer Intern", "Flutter app development", "2026-03-01", "2026-06-30", 30000, "selected", ""),
]

PLACEMENTS = [
    (1, 4, "Software Engineer", 18.0, "2026-01-15", "2026-07-01", "placed"),
    (2, 5, "Software Development Engineer", 22.0, "2026-01-20", "2026-07-01", "placed"),
    (8, 6, "AI Engineer", 28.0, "2026-02-01", "2026-07-15", "placed"),
    (6, 2, "Cloud Engineer", 12.0, "2026-02-10", "2026-07-01", "placed"),
    (3, 7, "Embedded Software Engineer", 8.5, "2026-01-25", "2026-07-01", "placed"),
    (4, 8, "Design Engineer", 7.0, "2026-02-05", "2026-07-15", "placed"),
    (10, 1, "Java Developer", 6.5, "2026-03-01", "2026-08-01", "placed"),
    (11, 4, "Site Reliability Engineer", 16.0, "2026-02-20", "2026-07-01", "placed"),
    (5, 6, "Backend Developer", 14.0, "2026-03-10", None, "shortlisted"),
    (9, 8, "Mechanical Engineer", 6.0, "2026-03-05", None, "applied"),
    (13, 3, "Mobile Developer", 9.0, "2026-03-15", None, "selected"),
    (14, 1, "Software Intern to PPO", 5.0, "2026-03-18", None, "applied"),
]


def seed():
    init_db()
    with app.app_context():
        if Student.query.first():
            print("Database already has data. Skipping seed.")
            return

        students = []
        for name, roll, email, phone, dept, year, cgpa, skills in STUDENTS:
            s = Student(name=name, roll_number=roll, email=email, phone=phone,
                        department=dept, year=year, cgpa=cgpa, skills=skills)
            db.session.add(s)
            students.append(s)
        db.session.flush()

        companies = []
        for name, ind, web, cp, ce, cph, addr, desc in COMPANIES:
            c = Company(name=name, industry=ind, website=web, contact_person=cp,
                        contact_email=ce, contact_phone=cph, address=addr, description=desc)
            db.session.add(c)
            companies.append(c)
        db.session.flush()

        for sid, cid, title, desc, sd, ed, stipend, status, notes in INTERNSHIPS:
            db.session.add(Internship(
                student_id=students[sid - 1].id, company_id=companies[cid - 1].id,
                title=title, description=desc, start_date=date.fromisoformat(sd),
                end_date=date.fromisoformat(ed), stipend=stipend, status=status,
                progress_notes=notes))

        for sid, cid, role, pkg, od, jd, status in PLACEMENTS:
            db.session.add(Placement(
                student_id=students[sid - 1].id, company_id=companies[cid - 1].id,
                role=role, package_lpa=pkg, offer_date=date.fromisoformat(od),
                joining_date=date.fromisoformat(jd) if jd else None, status=status))

        student_user = User(username="student1", email="aarav.sharma@college.edu", role="student")
        student_user.set_password("student123")
        db.session.add(student_user)
        db.session.flush()
        student_user.student_id = students[0].id

        db.session.commit()
        print(f"Seeded {len(students)} students, {len(companies)} companies, "
              f"{len(INTERNSHIPS)} internships, {len(PLACEMENTS)} placements.")
        print("Logins: admin/admin123, student1/student123")


if __name__ == "__main__":
    seed()
