"""Extract the small, reproducible Hackathon fixture from the supplied ZIP.

Usage: python server/prepare_data.py path/to/data.zip
"""

from __future__ import annotations

import csv
import io
import sys
import zipfile
from pathlib import Path


DEMO_DATE = "2026-01-16"
ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "seed_data"
REFERENCE_FILES = {
    "outlets.csv": "data/General Data/outlets.csv",
    "vehicles.csv": "data/General Data/vehicles.csv",
    "calendar.csv": "data/General Data/calendar.csv",
    "district_travel.csv": "data/General Data/district_travel.csv",
    "service_allowance.csv": "data/General Data/service_allowance.csv",
}


def main(archive_path: str) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        for destination, source in REFERENCE_FILES.items():
            (OUTPUT / destination).write_bytes(archive.read(source))

        with archive.open("data/Training Data/deliveries_train.csv") as source:
            reader = csv.DictReader(io.TextIOWrapper(source, encoding="utf-8-sig"))
            orders = [row for row in reader if row["order_date"] == DEMO_DATE]

    if len(orders) != 134:
        raise ValueError(f"Expected 134 orders for {DEMO_DATE}, found {len(orders)}")
    with (OUTPUT / "demo_orders.csv").open("w", encoding="utf-8", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(orders)
    print(f"Prepared {len(orders)} demo orders and {len(REFERENCE_FILES)} reference files")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python server/prepare_data.py path/to/data.zip")
    main(sys.argv[1])
