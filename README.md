# PlaceTrack - Internship & Placement Tracking System

A full-stack web application for colleges to manage student internship and placement records, company details, and generate reports.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, React Router, Chart.js |
| Backend    | Python Flask (REST API), Gunicorn (production) |
| Database   | MySQL/MariaDB or **PostgreSQL** via SQLAlchemy |
| Auth       | JWT (PyJWT), optional email-based password reset |
| Styling    | Bootstrap 5, Bootstrap Icons |
| Reports    | openpyxl (Excel export) |

## Prerequisites

- **Python 3.10+** (Render uses 3.12; see `render.yaml`)
- **Node.js 18+**
- **MySQL / MariaDB** *or* **PostgreSQL** for local development

## Quick Start

### 1. Database

**MySQL / MariaDB** (e.g. XAMPP):

```sql
CREATE DATABASE IF NOT EXISTS placetrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**PostgreSQL:**

```sql
CREATE DATABASE placetrack;
```

Set `DATABASE_URL` accordingly (see [Database configuration](#database-configuration)).

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Copy environment template and adjust values:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `backend/.env`: mail settings and `FRONTEND_URL` are required only if you use **forgot password** (SMTP). For local API-only use, you can omit mail variables.

```bash
# Optional: seed sample data (students, companies, etc.)
python seed_data.py

# Development server
python app.py
```

The API runs at **http://127.0.0.1:5001**.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Ensure `FRONTEND_URL` in the backend matches this origin when testing password reset emails.

## Database configuration

The backend reads `DATABASE_URL` from the environment (or `backend/.env` via [python-dotenv](https://pypi.org/project/python-dotenv/)).

| Engine   | Example `DATABASE_URL` |
|----------|-------------------------|
| MySQL    | `mysql+pymysql://user:password@localhost/placetrack` |
| PostgreSQL | `postgresql://user:password@localhost:5432/placetrack` |

**Render / Heroku-style URLs:** If the host provides `postgres://...`, the app normalizes it to `postgresql://` for SQLAlchemy automatically (`config.py`).

Default when unset (local dev): `mysql+pymysql://root:@localhost/placetrack`.

**Windows (CMD):**

```bat
set DATABASE_URL=mysql+pymysql://user:password@localhost/placetrack
```

**PowerShell:**

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/placetrack"
```

## Deploying on Render

The repo includes [`render.yaml`](render.yaml) for a **web service** (`gunicorn app:app`) plus a **PostgreSQL** database. After linking the repo:

1. Set `FRONTEND_URL` in the Render dashboard to your deployed frontend base URL (no trailing slash) if you use password reset mail.
2. Configure optional SMTP env vars (`MAIL_SERVER`, `MAIL_USERNAME`, etc.) for email.
3. `render.yaml` includes a placeholder `CORS_ORIGINS` key for documentation; the API currently allows all origins on `/api/*` via Flask-CORS. Tighten this in `app.py` if you need origin allowlists in production.

On startup, the API runs lightweight schema checks (for example, password-reset columns on `users`) using dialect-appropriate SQL for PostgreSQL vs MySQL/SQLite.

## Default credentials

| Role    | Username  | Password   |
|---------|-----------|------------|
| Admin   | admin     | admin123   |
| Student | student1  | student123 |

New users can self-register via the **Register** page. Admins should change the default admin password in production.

## Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | Admin module | JWT authentication, registration, role-based access |
| 2 | Student module | CRUD with department/year filters and pagination |
| 3 | Company module | CRUD with industry filters |
| 4 | Internship module | Status, stipend, progress notes |
| 5 | Placement module | Packages, offer/joining dates |
| 6 | Search & filter | Global search across entities |
| 7 | Report module | Department-wise reports and Excel exports |
| 8 | Admin dashboard | Statistics, Chart.js, recent activity |
| 9 | Student dashboard | Student view of own internships and placements |
| 10 | Appeals | Student appeals workflow (admin accept/reject) |
| 11 | Password security | Forgot/reset password (email), change password while logged in |

## Project structure

```
├── render.yaml             # Render Blueprint (API + Postgres)
├── README.md
├── backend/
│   ├── app.py              # Flask REST API
│   ├── config.py           # DB URL, JWT, mail, frontend URL
│   ├── models.py           # SQLAlchemy models
│   ├── mail_utils.py       # Optional SMTP / password-reset emails
│   ├── seed_data.py        # Sample data
│   ├── requirements.txt    # Python dependencies (incl. psycopg2-binary, gunicorn)
│   ├── .env.example        # Template for local secrets (copy to .env)
│   └── static_frontend/    # Production: built React assets (optional)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── context/        # AuthContext
    │   ├── components/
    │   └── pages/
    ├── package.json
    └── vite.config.js      # Dev proxy to API
```

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Token | Current user |
| POST | `/api/auth/forgot-password` | Public | Request reset email |
| POST | `/api/auth/reset-password` | Public | Reset with token |
| PUT | `/api/auth/password` | Token | Change password |
| GET | `/api/dashboard` | Token | Dashboard stats |
| GET/POST | `/api/students` | Token / Admin | List / create |
| GET/PUT/DELETE | `/api/students/:id` | Token / Admin | Detail / update / delete |
| GET/POST | `/api/companies` | Token / Admin | List / create |
| GET/PUT/DELETE | `/api/companies/:id` | Token / Admin | Detail / update / delete |
| GET/POST | `/api/internships` | Token / Admin | List / create |
| GET/PUT/DELETE | `/api/internships/:id` | Token / Admin | Detail / update / delete |
| GET/POST | `/api/placements` | Token / Admin | List / create |
| GET/PUT/DELETE | `/api/placements/:id` | Token / Admin | Detail / update / delete |
| POST | `/api/appeals` | Token | Student submit appeal |
| GET | `/api/appeals` | Token | List appeals |
| GET | `/api/appeals/:id` | Token | Appeal detail |
| POST | `/api/appeals/:id/accept` | Admin | Accept |
| POST | `/api/appeals/:id/reject` | Admin | Reject |
| GET | `/api/search?q=...` | Token | Global search |
| GET | `/api/reports/me` | Token | Student report |
| GET | `/api/reports/placement-summary` | Token | Placement report |
| GET | `/api/reports/internship-summary` | Token | Internship report |
| GET | `/api/reports/company-wise` | Token | Company-wise report |
| GET | `/api/reports/export/:type` | Token | Excel download |
| GET | `/api/options/students` | Token | Dropdown data |
| GET | `/api/options/companies` | Token | Dropdown data |

Static routes serve `static_frontend/` when present (useful for same-origin API + UI deploys).
