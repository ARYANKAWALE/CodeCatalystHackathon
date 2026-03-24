"""Add companies, internships, and placements to the production database via the API."""
import json
import urllib.request

API = "https://codecatalysthackathon.onrender.com/api"

data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request(f"{API}/auth/login", data=data, headers={"Content-Type": "application/json"}, method="POST")
resp = json.loads(urllib.request.urlopen(req).read())
token = resp["token"]
print("Logged in as admin\n")

headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

def post(endpoint, body):
    req = urllib.request.Request(f"{API}{endpoint}", data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        print(f"    Error: {err.get('error', 'unknown')}")
        return None

def get(endpoint):
    req = urllib.request.Request(f"{API}{endpoint}", headers=headers)
    return json.loads(urllib.request.urlopen(req).read())

# ── Add Companies ─────────────────────────────────────────────────────────────
COMPANIES = [
    {"name": "Cognizant", "industry": "IT Services", "website": "https://www.cognizant.com", "contact_person": "Shalini Das", "contact_email": "shalini.das@cognizant.com", "contact_phone": "9000200001", "address": "Cognizant Tower, Chennai", "description": "IT services and digital transformation company."},
    {"name": "Deloitte India", "industry": "Consulting", "website": "https://www.deloitte.com/in", "contact_person": "Vikram Sethi", "contact_email": "vikram.sethi@deloitte.com", "contact_phone": "9000200002", "address": "Deloitte Office, Mumbai", "description": "Global consulting and advisory firm."},
    {"name": "Flipkart", "industry": "E-Commerce", "website": "https://www.flipkart.com", "contact_person": "Priya Menon", "contact_email": "priya.menon@flipkart.com", "contact_phone": "9000200003", "address": "Flipkart Campus, Bangalore", "description": "India's leading e-commerce marketplace."},
    {"name": "Zoho Corporation", "industry": "Software", "website": "https://www.zoho.com", "contact_person": "Ramesh Kumar", "contact_email": "ramesh.kumar@zoho.com", "contact_phone": "9000200004", "address": "Zoho Campus, Chennai", "description": "SaaS products for business management."},
    {"name": "Larsen & Toubro", "industry": "Engineering / Construction", "website": "https://www.larsentoubro.com", "contact_person": "Anand Verma", "contact_email": "anand.verma@lnt.com", "contact_phone": "9000200005", "address": "L&T House, Mumbai", "description": "Infrastructure, engineering, and construction conglomerate."},
]

print("== Adding Companies ==")
for c in COMPANIES:
    result = post("/companies", c)
    if result:
        print(f"  Added: {c['name']}")
    else:
        print(f"  Skipped: {c['name']}")

# ── Fetch all students and companies for ID mapping ──────────────────────────
print("\nFetching students and companies...")
students_data = get("/students?per_page=100")
companies_data = get("/companies?per_page=100")

students_by_roll = {s["roll_number"]: s["id"] for s in students_data["items"]}
companies_by_name = {c["name"]: c["id"] for c in companies_data["items"]}

print(f"  Found {len(students_by_roll)} students, {len(companies_by_name)} companies\n")

# ── Add Internships ───────────────────────────────────────────────────────────
INTERNSHIPS = [
    {"roll": "CS2022016", "company": "Cognizant", "title": "Full Stack Developer Intern", "description": "Building internal tools with React and Python", "start_date": "2026-01-15", "end_date": "2026-04-15", "stipend": 35000, "status": "ongoing", "progress_notes": "Completed frontend module"},
    {"roll": "EC2022017", "company": "Zoho Corporation", "title": "Hardware Testing Intern", "description": "Testing embedded hardware modules", "start_date": "2025-06-01", "end_date": "2025-08-31", "stipend": 20000, "status": "completed", "progress_notes": "Delivered test automation suite"},
    {"roll": "IT2022018", "company": "Flipkart", "title": "Frontend Engineering Intern", "description": "React components for seller dashboard", "start_date": "2025-05-15", "end_date": "2025-08-15", "stipend": 55000, "status": "completed", "progress_notes": "Built 5 reusable UI components"},
    {"roll": "ME2022019", "company": "Larsen & Toubro", "title": "Structural Design Intern", "description": "CAD modeling for bridge project", "start_date": "2026-02-01", "end_date": "2026-05-01", "stipend": 18000, "status": "ongoing", "progress_notes": "Working on load calculations"},
    {"roll": "CS2023020", "company": "Deloitte India", "title": "Data Analytics Intern", "description": "Building BI dashboards with Power BI", "start_date": "2026-01-10", "end_date": "2026-03-31", "stipend": 40000, "status": "ongoing", "progress_notes": "Created 3 executive dashboards"},
    {"roll": "EE2023021", "company": "Larsen & Toubro", "title": "Electrical Systems Intern", "description": "PLC programming for factory automation", "start_date": "2025-07-01", "end_date": "2025-09-30", "stipend": 15000, "status": "completed", "progress_notes": "Automated 2 production lines"},
    {"roll": "IT2023023", "company": "Cognizant", "title": "DevOps Intern", "description": "CI/CD pipeline setup using Jenkins and Docker", "start_date": "2026-02-15", "end_date": "2026-05-15", "stipend": 32000, "status": "ongoing", "progress_notes": "Set up staging environment"},
    {"roll": "CE2023024", "company": "Larsen & Toubro", "title": "Site Planning Intern", "description": "Construction site survey and planning", "start_date": "2025-06-15", "end_date": "2025-09-15", "stipend": 12000, "status": "completed", "progress_notes": "Completed site survey for highway project"},
    {"roll": "CS2023022", "company": "Zoho Corporation", "title": "Software Development Intern", "description": "Backend APIs for CRM module", "start_date": "2026-03-01", "end_date": "2026-06-30", "stipend": 28000, "status": "applied", "progress_notes": ""},
    {"roll": "EE2023025", "company": "Zoho Corporation", "title": "IoT Solutions Intern", "description": "Smart office sensor integration", "start_date": "2026-03-10", "end_date": "2026-06-10", "stipend": 22000, "status": "selected", "progress_notes": ""},
]

print("== Adding Internships ==")
for i in INTERNSHIPS:
    sid = students_by_roll.get(i["roll"])
    cid = companies_by_name.get(i["company"])
    if not sid:
        print(f"  Skipped: student {i['roll']} not found")
        continue
    if not cid:
        print(f"  Skipped: company {i['company']} not found")
        continue
    body = {
        "student_id": sid, "company_id": cid, "title": i["title"],
        "description": i["description"], "start_date": i["start_date"],
        "end_date": i["end_date"], "stipend": i["stipend"],
        "status": i["status"], "progress_notes": i["progress_notes"],
    }
    result = post("/internships", body)
    if result:
        print(f"  Added: {i['title']} -> {i['roll']}")

# ── Add Placements ────────────────────────────────────────────────────────────
PLACEMENTS = [
    {"roll": "IT2022018", "company": "Flipkart", "role": "Frontend Engineer", "package_lpa": 16.0, "offer_date": "2026-02-01", "joining_date": "2026-07-15", "status": "placed"},
    {"roll": "CS2022016", "company": "Cognizant", "role": "Software Engineer", "package_lpa": 9.5, "offer_date": "2026-03-01", "joining_date": "2026-07-01", "status": "placed"},
    {"roll": "EC2022017", "company": "Zoho Corporation", "role": "Embedded Engineer", "package_lpa": 7.0, "offer_date": "2026-02-20", "joining_date": "2026-08-01", "status": "placed"},
    {"roll": "ME2022019", "company": "Larsen & Toubro", "role": "Design Engineer", "package_lpa": 6.5, "offer_date": "2026-03-10", "joining_date": None, "status": "shortlisted"},
    {"roll": "CS2023020", "company": "Deloitte India", "role": "Data Analyst", "package_lpa": 12.0, "offer_date": "2026-03-05", "joining_date": None, "status": "selected"},
    {"roll": "EE2023021", "company": "Larsen & Toubro", "role": "Electrical Engineer", "package_lpa": 5.5, "offer_date": "2026-03-15", "joining_date": "2026-08-01", "status": "placed"},
    {"roll": "IT2023023", "company": "Cognizant", "role": "DevOps Engineer", "package_lpa": 8.0, "offer_date": "2026-03-18", "joining_date": None, "status": "applied"},
    {"roll": "CE2023024", "company": "Larsen & Toubro", "role": "Civil Engineer", "package_lpa": 6.0, "offer_date": "2026-02-25", "joining_date": "2026-07-15", "status": "placed"},
]

print("\n== Adding Placements ==")
for p in PLACEMENTS:
    sid = students_by_roll.get(p["roll"])
    cid = companies_by_name.get(p["company"])
    if not sid:
        print(f"  Skipped: student {p['roll']} not found")
        continue
    if not cid:
        print(f"  Skipped: company {p['company']} not found")
        continue
    body = {
        "student_id": sid, "company_id": cid, "role": p["role"],
        "package_lpa": p["package_lpa"], "offer_date": p["offer_date"],
        "joining_date": p["joining_date"], "status": p["status"],
    }
    result = post("/placements", body)
    if result:
        print(f"  Added: {p['role']} ({p['package_lpa']} LPA) -> {p['roll']}")

print("\nDone!")
