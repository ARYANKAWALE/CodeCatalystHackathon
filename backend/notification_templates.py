"""User-facing email subject + body copy for PlaceTrack notifications."""

from __future__ import annotations


def _status_label(code: str) -> str:
    return (code or "").replace("_", " ").strip().title() or "Updated"


def welcome_register(*, greet_line: str, username: str, role_label: str) -> tuple[str, str]:
    subject = "Welcome to PlaceTrack — your account is ready"
    body = (
        f"{greet_line}"
        "You're officially part of PlaceTrack — we're glad you're here.\n\n"
        f"Username: {username}\n"
        f"Role: {role_label}\n\n"
        "Sign in anytime to track internships, placements, and requests in one place. "
        "Complete your profile and keep your resume link handy so opportunities never miss you.\n\n"
        "See you inside,\n"
        "— The PlaceTrack team"
    )
    return subject, body


def password_reset(*, username: str, link: str, minutes: int) -> tuple[str, str]:
    subject = "Reset your PlaceTrack password"
    body = (
        f"Hi {username},\n\n"
        "We got a request to reset your PlaceTrack password. Tap or paste the link below to choose a new one "
        f"(it's valid for {minutes} minutes):\n\n"
        f"{link}\n\n"
        "If you didn't ask for this, you can ignore this email — your password stays the same.\n\n"
        "Stay secure,\n"
        "— PlaceTrack"
    )
    return subject, body


def sign_in_notice(*, username: str, when_utc: str) -> tuple[str, str]:
    subject = "New sign-in to your PlaceTrack account"
    body = (
        f"Hi there,\n\n"
        f"Your PlaceTrack account ({username}) was used to sign in at {when_utc}.\n\n"
        "If that was you, no action needed. If not, change your password right away from your profile settings.\n\n"
        "— PlaceTrack"
    )
    return subject, body


def internship_added_to_profile(*, student_name: str, title: str, company: str) -> tuple[str, str]:
    subject = f"New internship on your profile — {company}"
    body = (
        f"Hi {student_name},\n\n"
        f"A new internship record was added for you: \"{title}\" at {company}.\n\n"
        "Open PlaceTrack to see full details, dates, and status. We'll email you again whenever your admin updates progress.\n\n"
        "Keep building your journey,\n"
        "— PlaceTrack"
    )
    return subject, body


def internship_status_changed(
    *, student_name: str, title: str, company: str, old_status: str, new_status: str
) -> tuple[str, str]:
    company = company or "your company"
    ns = (new_status or "").strip().lower()
    prev = _status_label(old_status)
    cur = _status_label(new_status)
    trail = f"(previously: {prev} → now: {cur})\n\n"

    if ns == "selected":
        subject = f"You're selected — {title} at {company}"
        lead = (
            f"Great news, {student_name}!\n\n"
            f"Your internship \"{title}\" with {company} is now marked as Selected. "
            "Celebrate this win — it's a real step forward.\n\n"
        )
    elif ns == "rejected":
        subject = f"Update on your internship — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your internship \"{title}\" with {company} has been updated to Rejected. "
            "That stings, but one outcome doesn't define you — new roles and companies are added all the time.\n\n"
        )
    elif ns == "ongoing":
        subject = f"Your internship with {company} is now ongoing"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your internship \"{title}\" at {company} is officially ongoing. "
            "Make the most of it — learn lots, document wins, and keep your mentor in the loop.\n\n"
        )
    elif ns == "completed":
        subject = f"Internship completed — nice work at {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"You've completed \"{title}\" at {company}. "
            "That's a strong milestone — add highlights to your profile and resume while they're fresh.\n\n"
        )
    elif ns == "applied":
        subject = f"Internship status updated — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your internship \"{title}\" at {company} is now recorded as Applied. "
            "We'll keep you posted when the status changes.\n\n"
        )
    else:
        subject = f"Internship update — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your internship \"{title}\" at {company} has a status update.\n\n"
        )
        trail = f"Status: {prev} → {cur}\n\n"

    body = lead + trail + "— PlaceTrack"
    return subject, body


def placement_added_to_profile(
    *, student_name: str, role: str, company: str, package_lpa: float | None
) -> tuple[str, str]:
    company = company or "the company"
    pkg = f"\nPackage (LPA): {package_lpa}\n" if package_lpa is not None else ""
    subject = f"New placement record — {role} at {company}"
    body = (
        f"Hi {student_name},\n\n"
        f"A placement record was added for you: {role} at {company}.{pkg}\n"
        "Review it on your dashboard — you'll get tailored emails whenever your status moves forward (or if something changes).\n\n"
        "— PlaceTrack"
    )
    return subject, body


def placement_status_changed(
    *,
    student_name: str,
    role: str,
    company: str,
    old_status: str,
    new_status: str,
    package_lpa: float | None,
) -> tuple[str, str]:
    company = company or "the company"
    ns = (new_status or "").strip().lower()
    prev = _status_label(old_status)
    cur = _status_label(new_status)
    pkg_line = f"Package: {package_lpa} LPA\n" if package_lpa is not None else ""

    if ns == "shortlisted":
        subject = f"Shortlisted — {role} at {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Strong move — you're shortlisted for {role} at {company}. "
            "Prep your stories and keep an eye on PlaceTrack for the next step.\n\n"
        )
    elif ns == "interview_scheduled":
        subject = f"Interview coming up — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your pipeline for {role} at {company} moved to Interview scheduled. "
            "You've got this — review the role, company, and your resume before you go in.\n\n"
        )
    elif ns == "selected":
        subject = f"Selected — {role} at {company}"
        lead = (
            f"Congratulations, {student_name}!\n\n"
            f"You've been selected for {role} at {company}. "
            "Huge milestone — celebrate, then confirm next steps with your placement cell if needed.\n\n"
        )
    elif ns == "offer_received":
        subject = f"Offer received — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"An offer is in for {role} at {company}. "
            "Read the details carefully, compare timelines, and choose what fits your goals best.\n\n"
        )
    elif ns == "accepted":
        subject = f"You accepted the offer — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your placement for {role} at {company} is marked as Accepted. "
            "Exciting chapter ahead — finish any formalities and stay in touch with your admin.\n\n"
        )
    elif ns == "placed":
        subject = f"You're placed — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"You're officially placed for {role} at {company}. "
            "We're rooting for you in this next phase of your career.\n\n"
        )
    elif ns == "rejected":
        subject = f"Update on {role} — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your application for {role} at {company} was updated to Rejected. "
            "It's not the end of the road — reflect, refine, and keep your other opportunities warm.\n\n"
        )
    elif ns == "withdrawn":
        subject = f"Placement withdrawn — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your placement entry for {role} at {company} is marked as Withdrawn. "
            "If this wasn't intentional, check with your admin.\n\n"
        )
    else:
        subject = f"Placement status update — {company}"
        lead = (
            f"Hi {student_name},\n\n"
            f"Your placement ({role} at {company}) has a new status.\n\n"
        )

    pkg_block = f"{pkg_line}\n" if pkg_line else ""
    summary = f"{pkg_block}Status: {prev} → {cur}\n\n"
    body = lead + summary + "— PlaceTrack"
    return subject, body


def appeal_received(*, student_name: str, kind: str, company: str, title: str, appeal_id: int) -> tuple[str, str]:
    subject = f"We received your {kind} request — {company}"
    body = (
        f"Hi {student_name},\n\n"
        f"Thanks for submitting your {kind} request for {company}.\n"
        f"Title: {title}\n"
        f"Reference ID: {appeal_id}\n"
        "Status: pending review by your admin.\n\n"
        "We'll email you as soon as there's a decision. Meanwhile, you can track it anytime under My requests.\n\n"
        "— PlaceTrack"
    )
    return subject, body


def appeal_accepted(*, student_name: str, kind: str, company: str, title: str) -> tuple[str, str]:
    subject = f"Approved — your {kind} request for {company}"
    body = (
        f"Hi {student_name},\n\n"
        f"Good news — your {kind} request for {company} ({title}) was approved.\n"
        "A matching record was added to your profile so you can track it like any other internship or placement.\n\n"
        "Keep the momentum going,\n"
        "— PlaceTrack"
    )
    return subject, body


def appeal_rejected(
    *, student_name: str, kind: str, company: str, title: str, admin_note: str | None
) -> tuple[str, str]:
    subject = f"Update on your {kind} request — {company}"
    note = f"\nNote from admin: {admin_note}\n" if admin_note else ""
    body = (
        f"Hi {student_name},\n\n"
        f"Your {kind} request for {company} ({title}) wasn't approved this time.{note}\n"
        "You can still explore other companies or submit a fresh request when you're ready.\n\n"
        "— PlaceTrack"
    )
    return subject, body
