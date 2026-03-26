#!/usr/bin/env python3
"""Read exif-dates.csv and update DAM database with photo_taken_at.
Usage: UPDATE_DB=1 python3 scripts/update-exif-dates.py exif-dates.csv
Requires POSTGRES_URL env var.
"""
import sys, os, csv
import psycopg2

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "exif-dates.csv"
    db_url = os.environ.get("POSTGRES_URL")
    dry_run = os.environ.get("UPDATE_DB") != "1"
    
    if not db_url:
        print("Set POSTGRES_URL env var", file=sys.stderr)
        sys.exit(1)
    
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    updated = 0
    skipped = 0
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row['date_taken']:
                skipped += 1
                continue
            filename = row['filename']
            date = row['date_taken']
            width = int(row['width']) if row['width'] else None
            height = int(row['height']) if row['height'] else None
            
            if dry_run:
                print(f"[DRY RUN] {filename} → {date} ({width}x{height})")
                updated += 1
            else:
                cur.execute("""
                    UPDATE assets 
                    SET photo_taken_at = %s,
                        width_px = COALESCE(width_px, %s),
                        height_px = COALESCE(height_px, %s)
                    WHERE filename = %s AND photo_taken_at IS NULL
                """, (date, width, height, filename))
                updated += cur.rowcount
    
    if not dry_run:
        conn.commit()
    
    conn.close()
    print(f"{'[DRY RUN] ' if dry_run else ''}Updated: {updated}, Skipped (no date): {skipped}")

if __name__ == "__main__":
    main()
