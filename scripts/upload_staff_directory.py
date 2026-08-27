#!/usr/bin/env python3
"""Upload staff phone/room directory into private.staff_directory.

Source JSON is local only (gitignored). The website never ships it —
lookups go through the public.lookup_staff RPC.

Usage:
  python3 scripts/upload_staff_directory.py --api
  python3 scripts/upload_staff_directory.py --api --file data/staff-directory.json

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
Never put the service role key in the website.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def post_rpc(url: str, service_key: str, fn: str, payload: dict) -> object:
    request = urllib.request.Request(
        f"{url.rstrip('/')}/rest/v1/rpc/{fn}",
        data=json.dumps(payload).encode("utf-8"),
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
    return json.loads(body)


def load_rows(path: Path) -> list[dict]:
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise SystemExit("Expected a JSON array of staff rows")
    cleaned: list[dict] = []
    for row in rows:
        name = str((row or {}).get("name") or "").strip()
        if not name:
            continue
        cleaned.append(
            {
                "name": name,
                "role": str(row.get("role") or "").strip(),
                "main_phone": str(row.get("main_phone") or "").strip(),
                "room": str(row.get("room") or "").strip(),
                "periods": row.get("periods") or {},
            }
        )
    return cleaned


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", action="store_true", help="Upload via admin RPC")
    parser.add_argument(
        "--file",
        type=Path,
        default=ROOT / "data" / "staff-directory.json",
        help="Local staff JSON (default: data/staff-directory.json)",
    )
    args = parser.parse_args()
    if not args.api:
        raise SystemExit("Pass --api to upload (keeps the service key off the website).")

    rows = load_rows(args.file)
    url = os.environ.get("SUPABASE_URL") or os.environ.get("FLHS_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload.\n"
            "The service role key must stay off the website."
        )

    n = int(post_rpc(url, key, "admin_replace_staff_directory", {"p_rows": rows}))
    print(f"Uploaded {n} staff directory rows")


if __name__ == "__main__":
    main()
