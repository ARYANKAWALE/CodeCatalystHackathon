# PlaceTrack - Internship & Placement Tracking System

A full-stack web application for colleges to manage student internship and placement records, company details, and generate reports.

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 19, Vite, React Router, Chart.js |
| Backend    | Python Flask (REST API)             |
| Database   | MySQL (MariaDB) via SQLAlchemy      |
| Auth       | JWT (PyJWT)                         |
| Styling    | Bootstrap 5, Bootstrap Icons        |
| Reports    | openpyxl (Excel export)             |

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MySQL / MariaDB** (e.g. via XAMPP)

## Quick Start

### 1. Start MySQL

Make sure MySQL is running (e.g. start XAMPP MySQL service) and create the database:

```sql
CREATE DATABASE IF NOT EXISTS placetrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Seed sample data (optional, creates 15 students, 8 companies, etc.)
python seed_data.py

# Start the API server
python app.py
```

The API runs at **http://127.0.0.1:5001**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Database Configuration

By default, the app connects to MySQL as `root` with no password at `localhost`. To change this, set the `DATABASE_URL` environment variable:

```bash
set DATABASE_URL=mysql+pymysql://user:password@localhost/placetrack
```

## Default Credentials

| Role    | Username   | Password    |
|---------|-----------|-------------|
| Admin   | admin     | admin123    |
| Student | student1  | student123  |

New users can self-register via the **Register** page.

## Modules

| # | Module                  | Description                                              |
|---|-------------------------|----------------------------------------------------------|
| 1 | Admin Module            | JWT authentication, registration, role-based access      |
| 2 | Student Module          | Full CRUD with department/year filters and pagination     |
| 3 | Company Module          | Full CRUD with industry filters                          |
| 4 | Internship Module       | Track internships with status, stipend, progress notes   |
| 5 | Placement Module        | Track placements with packages, offer/joining dates      |
| 6 | Search & Filter Module  | Global search across all entities                        |
| 7 | Report Module           | Department-wise reports + Excel exports                  |
| 8 | Admin Dashboard         | Statistics, Chart.js charts, recent activity             |
| 9 | Student Dashboard       | Student-specific view of own internships & placements    |

## Project Structure

```
├── backend/
│   ├── app.py              # Flask REST API (all endpoints)
│   ├── config.py           # MySQL + JWT configuration
│   ├── models.py           # SQLAlchemy models
│   ├── seed_data.py        # Sample data seeder
│   └── requirements.txt    # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # React Router setup
│   │   ├── App.css         # Custom styles
│   │   ├── api.js          # API client with JWT
│   │   ├── context/        # AuthContext (login/register/logout)
│   │   ├── components/     # Navbar, Pagination, StatusBadge, ProtectedRoute
│   │   └── pages/          # All page components (20+ files)
│   ├── package.json
│   └── vite.config.js      # Vite config with API proxy
│
└── README.md
```

## API Endpoints

| Method | Endpoint                        | Auth     | Description              |
|--------|---------------------------------|----------|--------------------------|
| POST   | /api/auth/register              | Public   | Register new user        |
| POST   | /api/auth/login                 | Public   | Login, returns JWT       |
| GET    | /api/auth/me                    | Token    | Current user info        |
| GET    | /api/dashboard                  | Token    | Dashboard stats          |
| GET    | /api/students                   | Token    | List students            |
| POST   | /api/students                   | Admin    | Create student           |
| GET    | /api/students/:id               | Token    | Student details          |
| PUT    | /api/students/:id               | Admin    | Update student           |
| DELETE | /api/students/:id               | Admin    | Delete student           |
| GET    | /api/companies                  | Token    | List companies           |
| POST   | /api/companies                  | Admin    | Create company           |
| GET    | /api/companies/:id              | Token    | Company details          |
| PUT    | /api/companies/:id              | Admin    | Update company           |
| DELETE | /api/companies/:id              | Admin    | Delete company           |
| GET    | /api/internships                | Token    | List internships         |
| POST   | /api/internships                | Admin    | Create internship        |
| GET    | /api/internships/:id            | Token    | Internship details       |
| PUT    | /api/internships/:id            | Admin    | Update internship        |
| DELETE | /api/internships/:id            | Admin    | Delete internship        |
| GET    | /api/placements                 | Token    | List placements          |
| POST   | /api/placements                 | Admin    | Create placement         |
| GET    | /api/placements/:id             | Token    | Placement details        |
| PUT    | /api/placements/:id             | Admin    | Update placement         |
| DELETE | /api/placements/:id             | Admin    | Delete placement         |
| GET    | /api/search?q=...               | Token    | Global search            |
| GET    | /api/reports/placement-summary  | Token    | Placement report         |
| GET    | /api/reports/internship-summary | Token    | Internship report        |
| GET    | /api/reports/company-wise       | Token    | Company-wise report      |
| GET    | /api/reports/export/:type       | Token    | Excel download           |
