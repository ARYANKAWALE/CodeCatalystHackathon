import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "placetrack-jwt-secret-2026")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost/placetrack"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRATION_HOURS = 24
