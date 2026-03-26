import os
from pathlib import Path

from dotenv import load_dotenv

# backend/.env — not committed; copy from .env.example
load_dotenv(Path(__file__).resolve().parent / ".env", encoding="utf-8-sig")


def _env_strip(key: str, default: str = "") -> str:
    v = (os.environ.get(key, default) or "").strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        v = v[1:-1].strip()
    return v


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "placetrack-jwt-secret-2026")

    db_url = os.environ.get("DATABASE_URL", "mysql+pymysql://root:@localhost/placetrack")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = db_url

    # Avoid hanging forever when MySQL/Postgres is down (first query blocks on connect).
    _db_connect_timeout = int(_env_strip("DB_CONNECT_TIMEOUT", "12") or "12")
    _engine_opts = {"pool_pre_ping": True, "pool_recycle": 280}
    _db_lower = db_url.lower()
    if "sqlite" not in _db_lower:
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

    # Base URL of the React app (no trailing slash). Used in password-reset emails.
    FRONTEND_URL = _env_strip("FRONTEND_URL", "http://localhost:5173")
    PASSWORD_RESET_EXPIRATION_MINUTES = int(_env_strip("PASSWORD_RESET_EXPIRATION_MINUTES", "60") or "60")

    # "You signed in" notification (adds DB work + mail thread). Set MAIL_SIGN_IN_EMAIL=true to enable.
    MAIL_SIGN_IN_EMAIL = _env_strip("MAIL_SIGN_IN_EMAIL", "false").lower() in ("1", "true", "yes")
