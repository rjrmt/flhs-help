#!/usr/bin/env python3
"""Convert an FLHS Advanced Report Excel export into data/homerooms.csv.

Expected columns (order may vary; matched by header name):
  - Last First M  (or similar name column)
  - Student ID
  - Grade
  - 01 A Teacher - Room   → White Day Period 1 homeroom
  - 05 B Teacher - Room   → Blue Day Period 5 homeroom

Student IDs are written as 10-digit strings (school format starts with 06).
If Excel stored them as numbers and dropped the leading zero, values are
left-padded back to 10 digits.

Usage:
  python3 scripts/convert_homerooms.py "/path/to/Advanced Report.xlsx"
  python3 scripts/convert_homerooms.py "/path/to/report.xlsx" -o data/homerooms.csv
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Missing dependency: openpyxl\n  pip3 install openpyxl", file=sys.stderr)
    sys.exit(1)

TEACHER_ROOM_RE = re.compile(r"^(.*?)\s+(\d{2}-\d{3,4})\s*$")

NAME_KEYS = ("last first", "name", "student name")
ID_KEYS = ("student id", "student number", "studentid", "id")
GRADE_KEYS = ("grade",)
WHITE_KEYS = ("01 a", "a teacher", "white")
BLUE_KEYS = ("05 b", "b teacher", "blue")


def normalize_header(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def find_col(headers: list[str], keys: tuple[str, ...]) -> int | None:
    for i, h in enumerate(headers):
        if any(k in h for k in keys):
            return i
    return None


def split_teacher_room(val: object) -> tuple[str, str]:
    if val is None:
        return "", ""
    s = str(val).strip()
    if not s:
        return "", ""
    m = TEACHER_ROOM_RE.match(s)
    if m:
        return m.group(1).strip(), m.group(2)
    return s, ""


STUDENT_ID_LEN = 10


def normalize_student_id(val: object) -> str:
    """Return the student ID as a digit string, preserving/restoring leading zeros.

    Excel often stores these as numbers (e.g. 618034812), dropping the school
    prefix. Valid FLHS IDs are 10 digits starting with 06, so shorter numeric
    values are left-padded with zeros.
    """
    if val is None:
        return ""
    if isinstance(val, float) and val.is_integer():
        val = int(val)
    elif isinstance(val, float):
        # Non-integer floats shouldn't appear for IDs; treat as text of int part.
        val = int(val)
    digits = re.sub(r"\D", "", str(val).strip())
    if not digits:
        return ""
    if len(digits) < STUDENT_ID_LEN:
        digits = digits.zfill(STUDENT_ID_LEN)
    return digits


def convert(src: Path, dest: Path) -> int:
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    raw_header = next(rows, None)
    if not raw_header:
        wb.close()
        raise SystemExit("Spreadsheet is empty.")

    headers = [normalize_header(h) for h in raw_header]
    name_i = find_col(headers, NAME_KEYS)
    id_i = find_col(headers, ID_KEYS)
    grade_i = find_col(headers, GRADE_KEYS)
    white_i = find_col(headers, WHITE_KEYS)
    blue_i = find_col(headers, BLUE_KEYS)

    missing = [
        label
        for label, idx in (
            ("name", name_i),
            ("student id", id_i),
            ("grade", grade_i),
            ("01 A / white homeroom", white_i),
            ("05 B / blue homeroom", blue_i),
        )
        if idx is None
    ]
    if missing:
        wb.close()
        raise SystemExit(
            "Could not find required columns: "
            + ", ".join(missing)
            + f"\nFound headers: {raw_header}"
        )

    dest.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with dest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "student_id",
                "name",
                "grade",
                "white_teacher",
                "white_room",
                "blue_teacher",
                "blue_room",
            ]
        )
        for row in rows:
            sid = normalize_student_id(row[id_i])
            name = str(row[name_i] or "").strip()
            if not sid and not name:
                continue
            grade = str(row[grade_i] if row[grade_i] is not None else "").strip()
            white_t, white_r = split_teacher_room(row[white_i])
            blue_t, blue_r = split_teacher_room(row[blue_i])
            writer.writerow([sid, name, grade, white_t, white_r, blue_t, blue_r])
            count += 1

    wb.close()
    return count


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx", type=Path, help="Path to Advanced Report .xlsx")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=root / "data" / "homerooms.csv",
        help="Output CSV path (default: data/homerooms.csv)",
    )
    args = parser.parse_args()

    if not args.xlsx.is_file():
        raise SystemExit(f"File not found: {args.xlsx}")

    n = convert(args.xlsx, args.output)
    print(f"Wrote {n} students → {args.output}")


if __name__ == "__main__":
    main()
