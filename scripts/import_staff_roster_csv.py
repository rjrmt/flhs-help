#!/usr/bin/env python3
"""Merge district Staff Roster.csv into private.staff_directory.

Keeps existing room / phone / periods from the database when names match.
Adds official E-Mail Address and Job Title from the CSV. Rows that exist
only in the local directory (CLINIC, placeholders, etc.) are preserved.

Filters to Fort Lauderdale High staff (excludes Fort Lauderdale Adult Center).

Usage:
  python3 scripts/import_staff_roster_csv.py --dry-run \\
    --csv "/path/to/Staff Roster.csv"

  python3 scripts/import_staff_roster_csv.py --api \\
    --csv "/path/to/Staff Roster.csv"

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for --api or --fetch-existing.
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

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from parse_laptop_inventory import directory_rows, match_name  # noqa: E402
from upload_staff_directory import post_rpc  # noqa: E402

MIDDLE = re.compile(r"^[A-Za-z]\.?$")
NAME_SUFFIXES = {"JR", "SR", "II", "III", "IV"}
# Roster display names that should attach to an existing directory row.
DIRECTORY_ALIASES: dict[tuple[str, str], str] = {
    ("Ramautar", "Rajesh"): "RAMAUTAR, RJ",
    ("Ramautar", "RJ"): "RAMAUTAR, RJ",
}


def fetch_existing_directory(url: str, service_key: str) -> list[dict]:
    request = urllib.request.Request(
        f"{url.rstrip('/')}/rest/v1/staff_directory?select=name,role,main_phone,room,periods,email",
        method="GET",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept-Profile": "private",
            "Content-Profile": "private",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Could not read staff_directory ({err.code}): {detail}") from err
    rows = json.loads(body)
    if not isinstance(rows, list):
        raise SystemExit("Unexpected staff_directory response")
    return rows


def is_flhs_row(description: str) -> bool:
    text = (description or "").strip().lower()
    if not text:
        return False
    if "adult center" in text:
        return False
    if "fort lauderdale high" in text:
        return True
    if text in {"fort lauderdale hs", "fort lauderdale hs."}:
        return True
    return False


def roster_last_first(display_name: str) -> tuple[str, str]:
    tokens = display_name.strip().split()
    if not tokens:
        return "", ""
    suffix: list[str] = []
    while len(tokens) >= 2 and tokens[-1].upper().strip(".") in NAME_SUFFIXES:
        suffix.insert(0, tokens.pop())
    last = tokens[-1] if tokens else ""
    if suffix:
        last = f"{last} {' '.join(suffix)}"
    first_parts: list[str] = []
    for token in tokens[:-1]:
        if MIDDLE.match(token):
            continue
        first_parts.append(token)
    return last, " ".join(first_parts)


def roster_to_directory_name(display_name: str) -> str:
    last, first = roster_last_first(display_name)
    if not last:
        return display_name.strip().upper()
    if first:
        return f"{last.upper()}, {first.upper()}"
    return last.upper()


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def alias_directory_name(last: str, first: str) -> str | None:
    return DIRECTORY_ALIASES.get((last.strip(), first.strip()))


def sql_str(value: str) -> str:
    return "'" + (value or "").replace("'", "''") + "'"


def load_roster_csv(path: Path) -> list[dict]:
    if not path.is_file():
        raise SystemExit(f"CSV not found: {path}")
    out: list[dict] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for raw in reader:
            name = (raw.get("Name") or "").strip()
            if not name:
                continue
            description = (raw.get("Description") or "").strip()
            if not is_flhs_row(description):
                continue
            job = (raw.get("Job Title") or "").strip()
            email = normalize_email(raw.get("E-Mail Address") or "")
            out.append(
                {
                    "roster_name": name,
                    "role": job,
                    "email": email,
                    "description": description,
                }
            )
    return out


def merge_roster(
    existing: list[dict],
    roster: list[dict],
) -> tuple[list[dict], list[str]]:
    """Return merged upload rows and human-readable match notes."""
    notes: list[str] = []
    indexed = [{**row, "id": i + 1} for i, row in enumerate(existing)]
    directory = directory_rows(indexed)
    matched_existing: set[str] = set()

    merged_by_name: dict[str, dict] = {}
    for row in existing:
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        merged_by_name[name] = {
            "name": name,
            "role": str(row.get("role") or "").strip(),
            "main_phone": str(row.get("main_phone") or "").strip(),
            "email": normalize_email(str(row.get("email") or "")),
            "room": str(row.get("room") or "").strip(),
            "periods": row.get("periods") or {},
        }

    for entry in roster:
        last, first = roster_last_first(entry["roster_name"])
        _staff_id, matched_name = match_name(last, first, directory)
        if not matched_name:
            matched_name = alias_directory_name(last, first)
        if matched_name:
            matched_existing.add(matched_name)
            row = merged_by_name[matched_name]
            if entry["email"]:
                row["email"] = entry["email"]
            if entry["role"]:
                row["role"] = entry["role"]
            notes.append(f"matched: {entry['roster_name']} -> {matched_name}")
            continue

        new_name = roster_to_directory_name(entry["roster_name"])
        if new_name in merged_by_name:
            row = merged_by_name[new_name]
            if entry["email"]:
                row["email"] = entry["email"]
            if entry["role"]:
                row["role"] = entry["role"]
            notes.append(f"matched (exact new name): {entry['roster_name']} -> {new_name}")
            continue

        # District roster lists many people not on our phone/cart directory — only merge
        # into existing rows so we don't create room-less records in the laptop survey.
        notes.append(f"skipped (no directory match): {entry['roster_name']} -> {new_name}")

    matched_roster = sum(1 for n in notes if n.startswith("matched"))
    skipped = sum(1 for n in notes if n.startswith("skipped"))
    notes.append(
        f"summary: roster={len(roster)} matched={matched_roster} skipped={skipped} total={len(merged_by_name)}"
    )

    rows = sorted(merged_by_name.values(), key=lambda r: r["name"])
    return rows, notes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        required=True,
        help="Path to Staff Roster.csv (OneDrive export)",
    )
    parser.add_argument("--api", action="store_true", help="Upload merged rows via admin RPC")
    parser.add_argument("--dry-run", action="store_true", help="Print stats only (no upload)")
    parser.add_argument(
        "--json-out",
        type=Path,
        help="Write merged rows JSON (for inspection or manual upload)",
    )
    parser.add_argument(
        "--existing-json",
        type=Path,
        help="Use this file instead of fetching current staff_directory",
    )
    args = parser.parse_args()

    roster = load_roster_csv(args.csv)
    url = os.environ.get("SUPABASE_URL") or os.environ.get("FLHS_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if args.existing_json:
        existing = json.loads(args.existing_json.read_text(encoding="utf-8"))
    elif url and key:
        existing = fetch_existing_directory(url, key)
    else:
        raise SystemExit(
            "Provide --existing-json or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "to load current directory rows for merge."
        )

    merged, notes = merge_roster(existing, roster)

    if args.json_out:
        args.json_out.write_text(json.dumps(merged, indent=2), encoding="utf-8")
        print(f"Wrote {len(merged)} rows to {args.json_out}")

    with_email = sum(1 for r in merged if r.get("email"))
    print(f"Roster FLHS rows: {len(roster)}")
    print(f"Merged directory rows: {len(merged)} ({with_email} with email)")
    for line in notes[-5:]:
        print(line)
    unmatched = [n for n in notes if n.startswith("added:")]
    if unmatched:
        print(f"New staff not in prior directory: {len(unmatched)}")
        for line in unmatched[:15]:
            print(f"  {line}")
        if len(unmatched) > 15:
            print(f"  ... and {len(unmatched) - 15} more")

    if args.dry_run and not args.api:
        return

    if not args.api:
        if not args.dry_run:
            raise SystemExit("Pass --dry-run and/or --api (and optionally --json-out).")
        return

    if not url or not key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload.")

    n = int(post_rpc(url, key, "admin_replace_staff_directory", {"p_rows": merged}))
    print(f"Uploaded {n} staff directory rows")


if __name__ == "__main__":
    main()
