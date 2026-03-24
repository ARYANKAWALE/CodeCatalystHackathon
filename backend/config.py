import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "placetrack-jwt-secret-2026")

    db_url = os.environ.get("DATABASE_URL", "mysql+pymysql://root:@localhost/placetrack")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = db_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRATION_HOURS = 24
