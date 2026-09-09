#!/usr/bin/env python3
"""Parse the district laptop Excel into carts + devices for FLHS inventory."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

CLASSROOM_CART = re.compile(r"^(C\d+|REFRESH C\d+|LAW|CARP|CTACE|CTECH2)$", re.I)
STOP = {"JR", "SR", "II", "III", "IV"}


def parts(value: str) -> list[str]:
    text = (value or "").upper()
    text = text.replace("?", "").replace('"', " ").replace("'", "")
    text = text.replace("-", " ").replace(",", " ").replace(".", " ")
    text = re.sub(r"[^A-Z ]", " ", text)
    tokens = [token for token in text.split() if token and token not in STOP]
    if tokens and len(tokens[0]) == 1:
        tokens = tokens[1:]
    return tokens


def levenshtein(left: str, right: str) -> int:
    if left == right:
        return 0
    if abs(len(left) - len(right)) > 2:
        return 99
    previous = list(range(len(right) + 1))
    for i, left_ch in enumerate(left, 1):
        current = [i]
        for j, right_ch in enumerate(right, 1):
            insert = current[j - 1] + 1
            delete = previous[j] + 1
            replace = previous[j - 1] + (left_ch != right_ch)
            current.append(min(insert, delete, replace))
        previous = current
    return previous[-1]


def first_ok(excel_first: list[str], directory_first: list[str]) -> bool:
    if not excel_first or not directory_first:
        return False
    left, right = excel_first[0], directory_first[0]
    if left == right:
        return True
    if len(left) >= 3 and len(right) >= 3 and (left.startswith(right) or right.startswith(left)):
        return True
    if levenshtein(left, right) <= 1 and min(len(left), len(right)) >= 4:
        return True
    if levenshtein(left, right) <= 2 and min(len(left), len(right)) >= 6:
        return True
    return False


def last_ok(excel_last: list[str], directory_last: list[str]) -> bool:
    if not excel_last or not directory_last:
        return False
    if excel_last == directory_last:
        return True
    if set(excel_last) <= set(directory_last):
        return True
    if excel_last[-1] == directory_last[-1] and len(excel_last[-1]) >= 4:
        return True
    return any(len(token) >= 4 and token in directory_last for token in excel_last)


def directory_rows(staff: list[dict]) -> list[tuple]:
    rows = []
    for person in staff:
        name = str(person.get("name") or "")
        if "," not in name:
            continue
        last, first = name.split(",", 1)
        rows.append((int(person["id"]), name, parts(last), parts(first)))
    return rows


def match_name(last: str, first: str, directory: list[tuple]) -> tuple[int | None, str | None]:
    excel_last, excel_first = parts(last), parts(first)
    hits = []
    for staff_id, name, dir_last, dir_first in directory:
        if not last_ok(excel_last, dir_last):
            continue
        if excel_first:
            if first_ok(excel_first, dir_first):
                hits.append((staff_id, name))
        elif len([row for row in directory if row[2] and row[2][-1] == excel_last[-1]]) == 1:
            hits.append((staff_id, name))
    unique = {item[0]: item for item in hits}
    if len(unique) == 1:
        staff_id, name = next(iter(unique.values()))
        return staff_id, name
    return None, None


def is_classroom_cart(cart: str) -> bool:
    return bool(cart and CLASSROOM_CART.match(cart))


def parse_cost(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def display_name(last: str, first: str) -> str:
    last = (last or "").strip()
    first = (first or "").strip()
    if last and first:
        return f"{last}, {first}"
    return last or first


def parse_workbook(path: Path, staff: list[dict]) -> tuple[list[dict], list[dict]]:
    import openpyxl

    workbook = openpyxl.load_workbook(path, data_only=True)
    sheet = workbook.active
    directory = directory_rows(staff)
    raw_rows = []
    cart_names: dict[str, tuple[str, str]] = {}

    for row in sheet.iter_rows(values_only=True):
        values = list(row) + [None] * 8
        kind, asset_tag, cost, model, serial, cart, last, first = values[:8]
        serial = str(serial).strip() if serial else ""
        if not serial:
            continue
        cart = str(cart).strip() if cart else ""
        last = str(last).strip() if last else ""
        first = str(first).strip() if first else ""
        model = str(model).strip() if model else ""
        asset_tag = str(asset_tag).strip() if asset_tag else ""
        raw_rows.append(
            {
                "serial": serial,
                "model": model,
                "asset_tag": asset_tag,
                "cost": parse_cost(cost),
                "cart_code": cart,
                "teacher_last": last,
                "teacher_first": first,
            }
        )
        if is_classroom_cart(cart) and (last or first):
            cart_names[cart] = (last, first)

    assets = []
    cart_devices = defaultdict(list)
    for row in raw_rows:
        cart = row["cart_code"]
        last, first = row["teacher_last"], row["teacher_first"]
        if is_classroom_cart(cart):
            kind = "classroom_cart"
            if cart in cart_names:
                last, first = cart_names[cart]
        elif cart.upper() == "STAFF" or last or first:
            kind = "staff"
        else:
            kind = "unassigned"
        staff_id, _matched = match_name(last, first, directory)
        teacher_name = display_name(last, first)
        asset = {
            "serial": row["serial"],
            "model": row["model"],
            "asset_tag": row["asset_tag"],
            "cost": row["cost"],
            "cart_code": cart,
            "assignment_kind": kind,
            "teacher_last": last,
            "teacher_first": first,
            "teacher_name": teacher_name,
            "staff_id": staff_id,
        }
        assets.append(asset)
        if kind == "classroom_cart":
            cart_devices[cart].append(asset)

    carts = []
    for cart, devices in sorted(cart_devices.items(), key=lambda item: item[0]):
        last, first = cart_names.get(cart, ("", ""))
        staff_id, _name = match_name(last, first, directory) if (last or first) else (None, None)
        models = Counter(device["model"] for device in devices)
        top_model = models.most_common(1)[0][0] if models else ""
        note_parts = []
        if last or first:
            note_parts.append("Teacher named on spreadsheet")
            if not staff_id:
                note_parts.append("name is not in the current staff directory")
        else:
            note_parts.append("No teacher named on spreadsheet")
        carts.append(
            {
                "cart_code": cart,
                "teacher_name": display_name(last, first),
                "staff_id": staff_id,
                "expected_count": len(devices),
                "notes": "; ".join(note_parts),
                "model_summary": top_model,
            }
        )
    return carts, assets


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--staff-json", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    staff = json.loads(args.staff_json.read_text())
    carts, assets = parse_workbook(args.xlsx, staff)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "carts.json").write_text(json.dumps(carts, separators=(",", ":")))
    (args.out_dir / "assets.json").write_text(json.dumps(assets, separators=(",", ":")))
    named_carts = sum(1 for cart in carts if cart["teacher_name"])
    matched_carts = sum(1 for cart in carts if cart["staff_id"])
    classroom = sum(1 for asset in assets if asset["assignment_kind"] == "classroom_cart")
    staff_devices = sum(1 for asset in assets if asset["assignment_kind"] == "staff")
    print(f"carts={len(carts)} named={named_carts} matched_staff={matched_carts}")
    print(f"assets={len(assets)} classroom={classroom} staff={staff_devices}")


if __name__ == "__main__":
    main()
