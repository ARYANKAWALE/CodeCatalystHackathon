import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent

# Project root .env first, then backend/.env (backend wins on duplicate keys).
if (_REPO_ROOT / ".env").is_file():
    load_dotenv(_REPO_ROOT / ".env", encoding="utf-8-sig")
if (_BACKEND_DIR / ".env").is_file():
    load_dotenv(_BACKEND_DIR / ".env", encoding="utf-8-sig", override=True)


def _env_strip(key: str, default: str = "") -> str:
    v = (os.environ.get(key, default) or "").strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        v = v[1:-1].strip()
    return v


def _database_url_from_env() -> str:
    raw = (os.environ.get("DATABASE_URL") or "").strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ("'", '"'):
        raw = raw[1:-1].strip()
    return raw


_db_from_env = _database_url_from_env()
if _db_from_env:
    _resolved_db_url = _db_from_env
else:
    _instance_dir = _BACKEND_DIR / "instance"
    _instance_dir.mkdir(exist_ok=True)
    _sqlite_path = _instance_dir / "placetrack.db"
    _resolved_db_url = f"sqlite:///{_sqlite_path.resolve().as_posix()}"
    print(
        "PlaceTrack: DATABASE_URL is not set - using local SQLite at",
        _sqlite_path.resolve(),
        "\n  Set DATABASE_URL in backend/.env (or Codecatalyst/.env) for MySQL/Postgres (e.g. Render External URL).",
    )

if _resolved_db_url.startswith("postgres://"):
    _resolved_db_url = _resolved_db_url.replace("postgres://", "postgresql://", 1)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "placetrack-jwt-secret-2026")

    SQLALCHEMY_DATABASE_URI = _resolved_db_url

    # Avoid hanging forever when MySQL/Postgres is down (first query blocks on connect).
    _db_connect_timeout = int(_env_strip("DB_CONNECT_TIMEOUT", "12") or "12")
    _engine_opts = {"pool_pre_ping": True, "pool_recycle": 280}
    _db_lower = _resolved_db_url.lower()
    if "sqlite" in _db_lower:
        _engine_opts["connect_args"] = {"check_same_thread": False}
    else:
        if "pymysql" in _db_lower or "mysql" in _db_lower:
            _engine_opts["connect_args"] = {"connect_timeout": _db_connect_timeout}
        elif "postgresql" in _db_lower:
            _engine_opts["connect_args"] = {"connect_timeout": _db_connect_timeout}
    SQLALCHEMY_ENGINE_OPTIONS = _engine_opts

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRATION_HOURS = 24

    # Email (optional). When MAIL_SERVER is empty, no messages are sent.
    MAIL_SERVER = _env_strip("MAIL_SERVER")
    MAIL_PORT = int(_env_strip("MAIL_PORT", "587") or "587")
    MAIL_USE_TLS = _env_strip("MAIL_USE_TLS", "true").lower() in ("1", "true", "yes")
    # Implicit TLS (e.g. Gmail port 465). If true, MAIL_USE_TLS is ignored for the connection.
    MAIL_USE_SSL = _env_strip("MAIL_USE_SSL", "false").lower() in ("1", "true", "yes")
    MAIL_USERNAME = _env_strip("MAIL_USERNAME")
    # Gmail app passwords are 16 chars; users often paste with spaces — remove them
    _raw_pw = _env_strip("MAIL_PASSWORD")
    MAIL_PASSWORD = "".join(_raw_pw.split()) if _raw_pw else ""
    MAIL_DEFAULT_SENDER = _env_strip("MAIL_DEFAULT_SENDER") or MAIL_USERNAME
    # HELO/EHLO hostname sent to SMTP (defaults to machine FQDN). Set on cloud hosts if mail is rejected
    # (e.g. smtp.office365.com / Gmail often dislike "localhost").
    MAIL_EHLO_HOSTNAME = _env_strip("MAIL_EHLO_HOSTNAME")

    # Base URL of the React app (no trailing slash). Used in password-reset emails.
    FRONTEND_URL = _env_strip("FRONTEND_URL", "http://localhost:5173")
    PASSWORD_RESET_EXPIRATION_MINUTES = int(_env_strip("PASSWORD_RESET_EXPIRATION_MINUTES", "60") or "60")

    # "You signed in" notification (adds DB work + mail thread). Set MAIL_SIGN_IN_EMAIL=true to enable.
    MAIL_SIGN_IN_EMAIL = _env_strip("MAIL_SIGN_IN_EMAIL", "false").lower() in ("1", "true", "yes")
