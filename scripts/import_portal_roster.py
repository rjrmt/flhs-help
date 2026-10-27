#!/usr/bin/env python3
"""Parse a Portal.csv student export into private.students rows.

The CSV stays off the website. This script only prints JSON batches for
database upsert (A/B period schedules, names, grades, laptop choice).

Usage:
  python3 scripts/import_portal_roster.py path/to/Portal.csv --out-dir /tmp/portal-batches
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

STUDENT_ID_LEN = 10
ROOM_RE = re.compile(r"^(.*?)(?:\s+)(\d{1,2}-\d{3,4}|\d{3,5})$")
PERIODS = [
    (1, "A", "01 A Course Title", "01 A Course Number", "01 A Teacher - Room"),
    (2, "A", "02 A Course Title", "02 A Course Number", "02 A Teacher - Room"),
    (3, "A", "03 A Course Title", "03 A Course Number", "03 A Teacher - Room"),
    (4, "A", "04 A Course Title", "04 A Course Number", "04 A Teacher - Room"),
    (5, "B", "05 B Course Title", "05 B Course Number", "05 B Teacher - Room"),
    (6, "B", "06 B Course Title", "06 B Course Number", "06 B Teacher - Room"),
    (7, "B", "07 B Course Title", "07 B Course Number", "07 B Teacher - Room"),
    (8, "B", "08 B Course Title", "08 B Course Number", "08 B Teacher - Room"),
]


def normalize_student_id(val: object) -> str:
    digits = re.sub(r"\D", "", str(val or ""))
    if not digits:
        return ""
    if len(digits) < STUDENT_ID_LEN:
        return digits.zfill(STUDENT_ID_LEN)
    return digits


def clean(val: object) -> str:
    return re.sub(r"\s+", " ", str(val or "")).strip()


def parse_teacher_room(raw: str) -> tuple[str, str]:
    text = clean(raw)
    if not text:
        return "", ""
    match = ROOM_RE.match(text)
    if not match:
        return text, ""
    return match.group(1).strip(), match.group(2).strip()


def cell_digits(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) < 10:
        return ""
    return digits[-10:]


def plan_504(raw: str) -> str:
    text = clean(raw)
    if not text or re.search(r"not applicable", text, re.I):
        return ""
    if re.search(r"\[Y\]", text):
        return "Y"
    return text


def parse_row(row: dict[str, str]) -> dict[str, object] | None:
    student_id = normalize_student_id(row.get("Local ID"))
    last_name = clean(row.get("Last")).upper()
    first_name = clean(row.get("First")).upper()
    if not student_id or not last_name:
        return None
    by_day: dict[str, list[dict[str, object]]] = {"A": [], "B": []}
    for number, day, title_key, number_key, teacher_key in PERIODS:
        teacher, room = parse_teacher_room(row.get(teacher_key) or "")
        item = {
            "period": number,
            "day": day,
            "course": clean(row.get(title_key)),
            "course_number": clean(row.get(number_key)),
            "teacher": teacher,
            "room": room,
        }
        by_day[day].append(item)
    first_a = by_day["A"][0] if by_day["A"] else {}
    first_b = by_day["B"][0] if by_day["B"] else {}
    choice = clean(row.get("Device Checkout Choice"))
    ack = clean(row.get("Device Checkout Policy Acknowledgement"))
    return {
        "student_id": student_id,
        "last_name": last_name,
        "first_name": first_name,
        "name": f"{last_name}, {first_name}",
        "grade": clean(row.get("Grade")),
        "white_teacher": first_a.get("teacher") or "",
        "white_room": first_a.get("room") or "",
        "blue_teacher": first_b.get("teacher") or "",
        "blue_room": first_b.get("room") or "",
        "laptop_opt_in": choice.lower() == "opt-in",
        "ell": clean(row.get("English Language Learner")),
        "ese": clean(row.get("ESE Primary Exceptionality")),
        "plan_504": plan_504(row.get("504 Eligible") or ""),
        "cell_phone": cell_digits(row.get("Student's Cell Phone") or ""),
        "device_ack": ack[:1].upper() == "Y",
        "device_choice": choice,
        "schedule": {"a": by_day["A"], "b": by_day["B"]},
    }


def load_portal(path: Path) -> list[dict[str, object]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = [parse_row(row) for row in csv.DictReader(handle)]
    out = [row for row in rows if row]
    seen: set[str] = set()
    unique: list[dict[str, object]] = []
    for row in out:
        sid = str(row["student_id"])
        if sid in seen:
            continue
        seen.add(sid)
        unique.append(row)
    return unique


def sql_batch(rows: list[dict[str, object]]) -> str:
    payload = json.dumps(rows, separators=(",", ":"), ensure_ascii=True)
    if "$portal$" in payload:
        raise SystemExit("Payload contains dollar-quote marker")
    return f"select public.admin_upsert_students($portal${payload}$portal$::jsonb);\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--out-dir", type=Path, help="Write SQL batch files")
    parser.add_argument("--batch-size", type=int, default=80)
    parser.add_argument("--ids-out", type=Path, help="Write kept student IDs JSON")
    args = parser.parse_args()
    rows = load_portal(args.csv_path)
    opt_in = sum(1 for row in rows if row["laptop_opt_in"])
    print(f"{len(rows)} students, {opt_in} laptop Opt-In", file=sys.stderr)
    if args.ids_out:
        args.ids_out.write_text(json.dumps([row["student_id"] for row in rows]), encoding="utf-8")
    if not args.out_dir:
        return
    args.out_dir.mkdir(parents=True, exist_ok=True)
    batches = 0
    for start in range(0, len(rows), args.batch_size):
        chunk = rows[start : start + args.batch_size]
        batches += 1
        path = args.out_dir / f"portal_{batches:02d}.sql"
        path.write_text(sql_batch(chunk), encoding="utf-8")
    print(f"Wrote {batches} batches → {args.out_dir}", file=sys.stderr)


if __name__ == "__main__":
    main()
