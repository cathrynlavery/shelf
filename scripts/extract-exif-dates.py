#!/usr/bin/env python3
"""Extract EXIF dates from local files and output CSV for DAM import.
Usage: python3 scripts/extract-exif-dates.py /path/to/export-root > exif-dates.csv
"""
import sys, os, csv, io
from PIL import Image
from PIL.ExifTags import TAGS

def get_date_taken(filepath):
    try:
        img = Image.open(filepath)
        exif = img._getexif()
        if exif:
            for tag_id, val in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'DateTimeOriginal':
                    # Convert "2025:10:29 15:23:12" to ISO format
                    return val.replace(':', '-', 2)
        return None
    except Exception:
        return None

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    writer = csv.writer(sys.stdout)
    writer.writerow(["filename", "relative_path", "date_taken", "width", "height"])
    
    count = 0
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
            if ext not in ('jpg', 'jpeg', 'png', 'heic', 'tiff'):
                continue
            filepath = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(filepath, root)
            date = get_date_taken(filepath)
            try:
                img = Image.open(filepath)
                w, h = img.size
            except Exception:
                w, h = None, None
            writer.writerow([fname, rel_path, date or "", w or "", h or ""])
            count += 1
            if count % 500 == 0:
                print(f"Processed {count} files...", file=sys.stderr)
    
    print(f"Done: {count} files processed", file=sys.stderr)

if __name__ == "__main__":
    main()
