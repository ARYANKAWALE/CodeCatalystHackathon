"""Indian mobile numbers only: E.164-style storage +91 followed by 10 digits (first digit 6–9)."""

import re

_IN_MOBILE = re.compile(r"^[6-9]\d{9}$")


def normalize_india_phone(raw):
    """
    Normalize to +91XXXXXXXXXX. Empty input is allowed.
    Returns (value, error_message). On success error_message is None.
    """
    if raw is None:
        return "", None
    s = str(raw).strip().replace(" ", "").replace("-", "")
    if not s:
        return "", None
    digits = re.sub(r"\D", "", s)
    if len(digits) >= 12 and digits.startswith("91"):
        mobile = digits[2:12]
    elif len(digits) == 10:
        mobile = digits
    else:
        return None

    if len(mobile) != 10 or not _IN_MOBILE.match(mobile):
        return None, "Phone must be a valid upto 10 digits"

    return f"+91{mobile}", None
