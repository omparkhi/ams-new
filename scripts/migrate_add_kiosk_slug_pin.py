import sys
import os
import re
import random

sys.path.insert(0, os.path.abspath('.'))

from app.utils.db_utils import get_db_connection

def generate_slug(name, existing_slugs):
    base = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if not base:
        base = 'org'
    slug = base
    counter = 1
    while slug in existing_slugs:
        counter += 1
        slug = f"{base}-{counter}"
    existing_slugs.add(slug)
    return slug

def migrate():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        c = conn.cursor()
        print("1. Adding 'Slug' and 'Kiosk PIN' columns to Companies table...")
        c.execute('ALTER TABLE Companies ADD COLUMN IF NOT EXISTS "Slug" VARCHAR(100);')
        c.execute('ALTER TABLE Companies ADD COLUMN IF NOT EXISTS "Kiosk PIN" VARCHAR(20) DEFAULT \'123456\';')
        c.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_slug ON Companies("Slug");')
        conn.commit()

        print("2. Backfilling existing companies with unique Slugs and randomized 6-digit PINs...")
        c.execute('SELECT "Company ID", "Company Name", "Slug", "Kiosk PIN" FROM Companies')
        rows = c.fetchall()

        existing_slugs = set()
        for r in rows:
            if r['Slug']:
                existing_slugs.add(r['Slug'])

        for r in rows:
            cid = r['Company ID']
            cname = r['Company Name'] or cid
            cur_slug = r['Slug']
            cur_pin = r['Kiosk PIN']

            needs_update = False
            new_slug = cur_slug
            new_pin = cur_pin

            if not cur_slug:
                new_slug = generate_slug(cname, existing_slugs)
                needs_update = True

            if not cur_pin or cur_pin == '123456':
                new_pin = str(random.randint(100000, 999999))
                needs_update = True

            if needs_update:
                c.execute('UPDATE Companies SET "Slug" = %s, "Kiosk PIN" = %s WHERE "Company ID" = %s', (new_slug, new_pin, cid))
                print(f"  -> Updated {cid} ({cname}): Slug='{new_slug}', Kiosk PIN='{new_pin}'")

        conn.commit()
        print("Migration completed successfully!")

        print("\n--- Current Companies With Slugs & PINs ---")
        c.execute('SELECT "Company ID", "Company Name", "Slug", "Kiosk PIN" FROM Companies')
        for r in c.fetchall():
            print(f"Company: {r['Company ID']} | Name: {r['Company Name']} | Slug: {r['Slug']} | PIN: {r['Kiosk PIN']}")

    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
