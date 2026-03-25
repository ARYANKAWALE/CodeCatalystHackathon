"""Run from backend/: python test_smtp.py you@example.com

Loads .env like the app, sends one test message. Use to verify SMTP before relying on the API.
"""

import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

from flask import Flask

from config import Config
from mail_utils import mail_config_snapshot, mail_ready, send_plain_email

if __name__ == "__main__":
    to = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not to:
        print("Usage: python test_smtp.py recipient@email.com")
        sys.exit(1)
    if to.count("@") != 1 or "@@" in to:
        print(
            "Invalid address — use exactly one @.\n"
            f"  You passed: {to!r}\n"
            "  Example:    python test_smtp.py aryankawale13@gmail.com"
        )
        sys.exit(1)

    app = Flask(__name__)
    app.config.from_object(Config)
    cfg = mail_config_snapshot(app)
    if not mail_ready(cfg):
        print("MAIL not configured: need MAIL_SERVER and MAIL_DEFAULT_SENDER (or MAIL_USERNAME).")
        sys.exit(1)

    ok = send_plain_email(
        cfg,
        to,
        "PlaceTrack SMTP test",
        "If you see this, SMTP from your .env / environment is working.",
    )
    sys.exit(0 if ok else 1)
