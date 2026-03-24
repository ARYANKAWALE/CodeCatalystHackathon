"""Add 10 students to the production database via the API."""
import json
import urllib.request

API = "https://codecatalysthackathon.onrender.com/api"

data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request(f"{API}/auth/login", data=data, headers={"Content-Type": "application/json"}, method="POST")
resp = json.loads(urllib.request.urlopen(req).read())
token = resp["token"]
print("Logged in as admin")

STUDENTS = [
    {"name": "Tanvi Kulkarni", "roll_number": "CS2022016", "email": "tanvi.kulkarni@college.edu", "phone": "9876543225", "department": "Computer Science", "year": 3, "cgpa": 8.8, "skills": "Python, FastAPI, Docker"},
    {"name": "Harsh Agarwal", "roll_number": "EC2022017", "email": "harsh.agarwal@college.edu", "phone": "9876543226", "department": "Electronics", "year": 2, "cgpa": 7.4, "skills": "VHDL, FPGA, Verilog"},
    {"name": "Riya Saxena", "roll_number": "IT2022018", "email": "riya.saxena@college.edu", "phone": "9876543227", "department": "Information Technology", "year": 4, "cgpa": 8.5, "skills": "React, Redux, GraphQL"},
    {"name": "Karan Malhotra", "roll_number": "ME2022019", "email": "karan.malhotra@college.edu", "phone": "9876543228", "department": "Mechanical", "year": 3, "cgpa": 7.7, "skills": "FEA, Ansys, SolidWorks"},
    {"name": "Pooja Hegde", "roll_number": "CS2023020", "email": "pooja.hegde@college.edu", "phone": "9876543229", "department": "Computer Science", "year": 2, "cgpa": 9.3, "skills": "Data Science, Pandas, SQL"},
    {"name": "Amit Tiwari", "roll_number": "EE2023021", "email": "amit.tiwari@college.edu", "phone": "9876543230", "department": "Electrical", "year": 2, "cgpa": 7.1, "skills": "Power Systems, PLC, SCADA"},
    {"name": "Neha Sharma", "roll_number": "CS2023022", "email": "neha.sharma@college.edu", "phone": "9876543231", "department": "Computer Science", "year": 1, "cgpa": 8.4, "skills": "C++, OOP, DSA"},
    {"name": "Raj Patel", "roll_number": "IT2023023", "email": "raj.patel@college.edu", "phone": "9876543232", "department": "Information Technology", "year": 3, "cgpa": 8.1, "skills": "DevOps, Jenkins, AWS"},
    {"name": "Simran Kaur", "roll_number": "CE2023024", "email": "simran.kaur@college.edu", "phone": "9876543233", "department": "Civil", "year": 2, "cgpa": 7.9, "skills": "AutoCAD, Revit, Staad Pro"},
    {"name": "Deepak Choudhary", "roll_number": "EE2023025", "email": "deepak.choudhary@college.edu", "phone": "9876543234", "department": "Electrical", "year": 3, "cgpa": 7.3, "skills": "Arduino, Embedded C, IoT"},
]

for s in STUDENTS:
    body = json.dumps(s).encode()
    req = urllib.request.Request(f"{API}/students", data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        print(f"  Added {s['name']} ({s['roll_number']})")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        print(f"  Skipped {s['name']} — {err.get('error', 'unknown error')}")

print("\nDone!")
