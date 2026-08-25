#!/usr/bin/env python3
"""Merge homeroom + Opt-In CSVs into SQL for private.students.

The website never ships these CSVs. Staff keep them locally (gitignored)
and upload through the database.

Usage:
  python3 scripts/upload_students.py --api
  python3 scripts/upload_students.py --sql --out /tmp/students.sql

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for --api.
Never put the service role key in the website.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

STUDENT_ID_LEN = 10
ROOT = Path(__file__).resolve().parents[1]


def normalize_student_id(val: object) -> str:
    digits = re.sub(r"\D", "", str(val or ""))
    if not digits:
        return ""
    if len(digits) < STUDENT_ID_LEN:
        return digits.zfill(STUDENT_ID_LEN)
    return digits


def sql_str(value: object) -> str:
    return "'" + str(value or "").replace("'", "''") + "'"


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def merge_students(homeroom_path: Path, eligible_path: Path) -> list[dict[str, object]]:
    by_id: dict[str, dict[str, object]] = {}
    for row in read_csv(homeroom_path):
        student_id = normalize_student_id(row.get("student_id"))
        if not student_id:
            continue
        by_id[student_id] = {
            "student_id": student_id,
            "name": (row.get("name") or "").strip(),
            "grade": (row.get("grade") or "").strip(),
            "white_teacher": (row.get("white_teacher") or "").strip(),
            "white_room": (row.get("white_room") or "").strip(),
            "blue_teacher": (row.get("blue_teacher") or "").strip(),
            "blue_room": (row.get("blue_room") or "").strip(),
            "laptop_opt_in": False,
        }
    for row in read_csv(eligible_path):
        student_id = normalize_student_id(row.get("student_id"))
        if not student_id:
            continue
        choice = (row.get("choice") or "").strip()
        if not re.search(r"opt-?\s*in", choice, re.I):
            continue
        current = by_id.get(student_id)
        if current is None:
            by_id[student_id] = {
                "student_id": student_id,
                "name": (row.get("name") or "").strip(),
                "grade": (row.get("grade") or "").strip(),
                "white_teacher": "",
                "white_room": "",
                "blue_teacher": "",
                "blue_room": "",
                "laptop_opt_in": True,
            }
        else:
            if not current["name"]:
                current["name"] = (row.get("name") or "").strip()
            if not current["grade"]:
                current["grade"] = (row.get("grade") or "").strip()
            current["laptop_opt_in"] = True
    return list(by_id.values())


def values_sql(row: dict[str, object]) -> str:
    opt_in = "true" if row["laptop_opt_in"] else "false"
    return (
        f"({sql_str(row['student_id'])}, {sql_str(row['name'])}, {sql_str(row['grade'])}, "
        f"{sql_str(row['white_teacher'])}, {sql_str(row['white_room'])}, "
        f"{sql_str(row['blue_teacher'])}, {sql_str(row['blue_room'])}, {opt_in})"
    )


def upsert_sql(rows: list[dict[str, object]], batch_size: int = 250) -> list[str]:
    statements: list[str] = []
    for start in range(0, len(rows), batch_size):
        chunk = rows[start : start + batch_size]
        values = ",\n".join(values_sql(row) for row in chunk)
        statements.append(
            f"""insert into private.students (
  student_id, name, grade, white_teacher, white_room, blue_teacher, blue_room, laptop_opt_in
) values
{values}
on conflict (student_id) do update set
  name = excluded.name,
  grade = excluded.grade,
  white_teacher = excluded.white_teacher,
  white_room = excluded.white_room,
  blue_teacher = excluded.blue_teacher,
  blue_room = excluded.blue_room,
  laptop_opt_in = excluded.laptop_opt_in,
  updated_at = now();"""
        )
    return statements


def post_batch(url: str, service_key: str, rows: list[dict[str, object]]) -> int:
    payload = json.dumps({"p_rows": rows}).encode("utf-8")
    request = urllib.request.Request(
        f"{url.rstrip('/')}/rest/v1/rpc/admin_upsert_students",
        data=payload,
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Upload failed ({err.code}): {detail}") from err
    return int(json.loads(body))


def upload_via_api(rows: list[dict[str, object]], batch_size: int = 200) -> int:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("FLHS_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload.\n"
            "The service role key must stay off the website."
        )
    total = 0
    for start in range(0, len(rows), batch_size):
        chunk = rows[start : start + batch_size]
        total += post_batch(url, key, chunk)
        print(f"Uploaded {min(start + batch_size, len(rows))} / {len(rows)}", file=sys.stderr)
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--homerooms",
        type=Path,
        default=ROOT / "data" / "homerooms.csv",
    )
    parser.add_argument(
        "--eligible",
        type=Path,
        default=ROOT / "data" / "laptop-eligible.csv",
    )
    parser.add_argument("--api", action="store_true", help="Upload via service-role RPC (needs env keys)")
    parser.add_argument("--sql", action="store_true", help="Print UPSERT SQL")
    parser.add_argument("--out", type=Path, help="Write SQL to this file instead of stdout")
    parser.add_argument("--batch-dir", type=Path, help="Write one SQL file per batch")
    args = parser.parse_args()

    rows = merge_students(args.homerooms, args.eligible)
    opt_in = sum(1 for row in rows if row["laptop_opt_in"])

    if args.api:
        uploaded = upload_via_api(rows)
        print(f"Uploaded {uploaded} rows ({len(rows)} students, {opt_in} Opt-In)")
        return

    statements = upsert_sql(rows)

    if args.batch_dir:
        args.batch_dir.mkdir(parents=True, exist_ok=True)
        for index, statement in enumerate(statements, start=1):
            path = args.batch_dir / f"students_{index:02d}.sql"
            path.write_text(statement + "\n", encoding="utf-8")
        print(f"Wrote {len(statements)} batches ({len(rows)} students, {opt_in} Opt-In) → {args.batch_dir}", file=sys.stderr)
        return

    sql = "\n\n".join(statements) + "\n"
    if args.out:
        args.out.write_text(sql, encoding="utf-8")
        print(f"Wrote {len(rows)} students ({opt_in} Opt-In) → {args.out}", file=sys.stderr)
        return

    if args.sql:
        sys.stdout.write(sql)
        print(f"{len(rows)} students ({opt_in} Opt-In)", file=sys.stderr)
        return

    print(f"{len(rows)} students, {opt_in} Opt-In")
    print("Re-run with --sql or --batch-dir to generate the upload statements.")


if __name__ == "__main__":
    main()
