"""Optional SMTP notifications. Disabled when MAIL_SERVER is unset."""

import logging
import socket
import threading
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def _valid_recipient_addr(to_addr: str) -> bool:
    """Reject malformed addresses (e.g. user@@domain.com) before SMTP."""
    s = (to_addr or "").strip()
    if not s or " " in s:
        return False
    if s.count("@") != 1:
        return False
    local, _, domain = s.partition("@")
    return bool(local and domain)


def mail_ready(cfg: dict) -> bool:
    """True when SMTP host is set and we have a From address (explicit or MAIL_USERNAME)."""
    server = (cfg.get("MAIL_SERVER") or "").strip()
    sender = (cfg.get("MAIL_DEFAULT_SENDER") or cfg.get("MAIL_USERNAME") or "").strip()
    return bool(server and sender)


def send_plain_email(cfg: dict, to_addr: str, subject: str, body: str) -> bool:
    to_addr = (to_addr or "").strip()
    if not _valid_recipient_addr(to_addr):
        logger.error(
            "Invalid recipient email %r — use a single @ (e.g. name@gmail.com), not @@ or spaces.",
            to_addr,
        )
        return False
    server_host = (cfg.get("MAIL_SERVER") or "").strip()
    sender = (cfg.get("MAIL_DEFAULT_SENDER") or cfg.get("MAIL_USERNAME") or "").strip()
    if not server_host or not to_addr or not sender:
        return False
    if "@" in server_host:
        logger.error(
            "MAIL_SERVER must be the SMTP hostname (e.g. smtp.gmail.com), not your email address. "
            "Use MAIL_USERNAME / MAIL_DEFAULT_SENDER for %r. Got MAIL_SERVER=%r",
            to_addr,
            server_host,
        )
        return False

    port = int(cfg.get("MAIL_PORT") or 587)
    use_tls = bool(cfg.get("MAIL_USE_TLS", True))
    use_ssl = bool(cfg.get("MAIL_USE_SSL", False))
    user = (cfg.get("MAIL_USERNAME") or "").strip()
    password = "".join((cfg.get("MAIL_PASSWORD") or "").split())

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_addr
    msg.set_content(body)

    if "gmail.com" in server_host.lower() and (not user or not password):
        logger.error(
            "Gmail SMTP requires MAIL_USERNAME and MAIL_PASSWORD (app password). "
            "Email to %s was not sent.",
            to_addr,
        )
        return False

    context = ssl.create_default_context()

    def _send_ssl():
        with smtplib.SMTP_SSL(server_host, port, context=context, timeout=45) as smtp:
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)

    def _send_starttls():
        with smtplib.SMTP(server_host, port, timeout=45) as smtp:
            smtp.starttls(context=context)
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)

    def _send_plain():
        with smtplib.SMTP(server_host, port, timeout=45) as smtp:
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)

    try:
        if use_ssl:
            _send_ssl()
        elif use_tls:
            _send_starttls()
        else:
            _send_plain()
        logger.info("Sent email to %s subject=%r", to_addr, subject[:60])
        return True
    except Exception as first_err:
        if isinstance(first_err, socket.gaierror):
            logger.error(
                "Cannot resolve MAIL_SERVER %r — fix typo or DNS/network. Email to %s not sent.",
                server_host,
                to_addr,
            )
            return False
        # Some networks block 587 STARTTLS; Gmail also accepts implicit SSL on 465.
        if (
            not use_ssl
            and use_tls
            and "gmail.com" in server_host.lower()
            and port == 587
        ):
            logger.warning(
                "SMTP on port 587 failed (%s); retrying Gmail on port 465 (SSL).",
                first_err,
            )
            try:
                with smtplib.SMTP_SSL(server_host, 465, context=context, timeout=45) as smtp:
                    if user:
                        smtp.login(user, password)
                    smtp.send_message(msg)
                logger.info("Sent email to %s subject=%r (via port 465)", to_addr, subject[:60])
                return True
            except Exception:
                logger.exception("Failed to send email to %s (including 465 fallback)", to_addr)
                return False
        logger.exception("Failed to send email to %s", to_addr)
        return False


def mail_config_snapshot(app) -> dict:
    return {
        "MAIL_SERVER": app.config.get("MAIL_SERVER", ""),
        "MAIL_PORT": app.config.get("MAIL_PORT", 587),
        "MAIL_USE_TLS": app.config.get("MAIL_USE_TLS", True),
        "MAIL_USE_SSL": app.config.get("MAIL_USE_SSL", False),
        "MAIL_USERNAME": app.config.get("MAIL_USERNAME", ""),
        "MAIL_PASSWORD": app.config.get("MAIL_PASSWORD", ""),
        "MAIL_DEFAULT_SENDER": app.config.get("MAIL_DEFAULT_SENDER", ""),
    }


def schedule_plain_email(app, to_addr: str, subject: str, body: str) -> None:
    """Send on a background thread so HTTP handlers return immediately (avoids proxy 502 on slow SMTP)."""
    cfg = mail_config_snapshot(app)
    to_addr = (to_addr or "").strip()
    if not to_addr:
        logger.warning("Email skipped: no recipient address")
        return
    if not mail_ready(cfg):
        logger.warning(
            "Email skipped: set MAIL_SERVER and MAIL_USERNAME (and MAIL_PASSWORD for authenticated SMTP) "
            "in backend/.env — MAIL_DEFAULT_SENDER defaults to MAIL_USERNAME if unset."
        )
        return

    def run():
        try:
            send_plain_email(cfg, to_addr, subject, body)
        except Exception:
            logger.exception("Background email failed for %s", to_addr)

    threading.Thread(target=run, daemon=True).start()
