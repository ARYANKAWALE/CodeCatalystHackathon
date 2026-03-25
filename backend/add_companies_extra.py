"""Insert the 50 companies from companies_extra.py if they are not already present.

Run from backend/:  python add_companies_extra.py
"""

from app import app, db
from companies_extra import COMPANIES_EXTRA_50
from models import Company


def main():
    with app.app_context():
        added = 0
        skipped = 0
        for row in COMPANIES_EXTRA_50:
            name, industry, website, contact_person, contact_email, contact_phone, address, description = row
            if Company.query.filter_by(name=name).first():
                skipped += 1
                continue
            db.session.add(
                Company(
                    name=name,
                    industry=industry,
                    website=website,
                    contact_person=contact_person,
                    contact_email=contact_email,
                    contact_phone=contact_phone,
                    address=address,
                    description=description,
                )
            )
            added += 1
        db.session.commit()
        print(f"Added {added} companies; skipped {skipped} (name already exists).")


if __name__ == "__main__":
    main()
