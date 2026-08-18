#!/usr/bin/env python3
"""Convert a Focus/Portal device-checkout export into data/laptop-eligible.csv.

Accepts .csv or .xlsx. Keeps only student id, name, grade, and form choice —
never parent phones, emails, or addresses.

Expected columns (matched by header name, order may vary):
  - Local ID / Student ID
  - Last First M / Name
  - Grade
  - Device Checkout Choice (optional; defaults to Opt-In)

Student IDs are written as 10-digit strings (school format starts with 06).

Usage:
  python3 scripts/convert_laptop_checkout.py "/path/to/Portal.csv"
  python3 scripts/convert_laptop_checkout.py "/path/to/export.xlsx" -o data/laptop-eligible.csv
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

ID_KEYS = ("local id", "student id", "student number", "studentid")
NAME_KEYS = ("last first", "student name", "name")
GRADE_KEYS = ("grade",)
CHOICE_KEYS = ("device checkout choice", "checkout choice", "opt")


def normalize_header(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def find_col(headers: list[str], keys: tuple[str, ...]) -> int | None:
    for i, h in enumerate(headers):
        if any(k in h for k in keys):
            return i
    return None


STUDENT_ID_LEN = 10


def normalize_student_id(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, float) and val.is_integer():
        val = int(val)
    elif isinstance(val, float):
        val = int(val)
    digits = re.sub(r"\D", "", str(val).strip())
    if not digits:
        return ""
    if len(digits) < STUDENT_ID_LEN:
        digits = digits.zfill(STUDENT_ID_LEN)
    return digits


def read_rows(src: Path) -> tuple[list[str], list[tuple]]:
    suffix = src.suffix.lower()
    if suffix == ".csv":
        with src.open(newline="", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            raw_header = next(reader, None)
            if not raw_header:
                raise SystemExit("Spreadsheet is empty.")
            rows = [tuple(r) for r in reader]
            return [str(h) for h in raw_header], rows

    if suffix in {".xlsx", ".xlsm"}:
        try:
            import openpyxl
        except ImportError:
            print("Missing dependency: openpyxl\n  pip3 install openpyxl", file=sys.stderr)
            sys.exit(1)
        wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
        ws = wb.active
        it = ws.iter_rows(values_only=True)
        raw_header = next(it, None)
        if not raw_header:
            wb.close()
            raise SystemExit("Spreadsheet is empty.")
        rows = [tuple(r) for r in it]
        wb.close()
        return [str(h) if h is not None else "" for h in raw_header], rows

    raise SystemExit(f"Unsupported file type: {src.suffix} (use .csv or .xlsx)")


def convert(src: Path, dest: Path) -> int:
    raw_header, rows = read_rows(src)
    headers = [normalize_header(h) for h in raw_header]
    id_i = find_col(headers, ID_KEYS)
    name_i = find_col(headers, NAME_KEYS)
    grade_i = find_col(headers, GRADE_KEYS)
    choice_i = find_col(headers, CHOICE_KEYS)

    missing = [
        label
        for label, idx in (
            ("student id", id_i),
            ("name", name_i),
            ("grade", grade_i),
        )
        if idx is None
    ]
    if missing:
        raise SystemExit(
            "Could not find required columns: "
            + ", ".join(missing)
            + f"\nFound headers: {raw_header}"
        )

    dest.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    seen: set[str] = set()
    with dest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["student_id", "name", "grade", "choice"])
        for row in rows:
            if not row:
                continue
            sid = normalize_student_id(row[id_i] if id_i < len(row) else "")
            name = str(row[name_i] if name_i < len(row) and row[name_i] is not None else "").strip()
            if not sid and not name:
                continue
            if sid in seen:
                continue
            if sid:
                seen.add(sid)
            grade = str(
                row[grade_i] if grade_i < len(row) and row[grade_i] is not None else ""
            ).strip()
            choice = "Opt-In"
            if choice_i is not None and choice_i < len(row) and row[choice_i] is not None:
                choice = str(row[choice_i]).strip() or choice
            writer.writerow([sid, name, grade, choice])
            count += 1
    return count


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Path to Portal/Focus .csv or .xlsx")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=root / "data" / "laptop-eligible.csv",
        help="Output CSV path (default: data/laptop-eligible.csv)",
    )
    args = parser.parse_args()

    if not args.source.is_file():
        raise SystemExit(f"File not found: {args.source}")

    n = convert(args.source, args.output)
    print(f"Wrote {n} eligible students → {args.output}")


if __name__ == "__main__":
    main()
