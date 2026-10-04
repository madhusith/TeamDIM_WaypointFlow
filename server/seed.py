"""Create schema, import reference tables, and seed a repeatable demo day."""

from __future__ import annotations

import csv
import os
import time
from pathlib import Path

from db import connect
from security import hash_password


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "seed_data"
DEMO_DATE = "2026-01-16"


def rows(filename: str):
    with (DATA / filename).open(encoding="utf-8-sig", newline="") as stream:
        yield from csv.DictReader(stream)


def open_database():
    for attempt in range(30):
        try:
            return connect()
        except Exception:
            if attempt == 29:
                raise
            time.sleep(1)


def seed() -> None:
    with open_database() as conn:
        with conn.cursor() as cursor:
            cursor.execute((ROOT / "schema.sql").read_text(encoding="utf-8"))

            for row in rows("outlets.csv"):
                cursor.execute(
                    """INSERT INTO outlets
                       (id, brand, district, depot, dock_type, parking_constraint,
                        mall_window, window_open_time, window_close_time)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO NOTHING""",
                    (row["outlet_id"], row["brand"], row["district"], row["depot"],
                     row["dock_type"], row["parking_constraint"] or None,
                     row["mall_window"] or None, row["window_open_time"],
                     row["window_close_time"]),
                )

            for row in rows("vehicles.csv"):
                cursor.execute(
                    """INSERT INTO vehicles
                       (id, type, temp, weight_cap_kg, volume_cap_m3, fuel_type,
                        km_per_l, weekly_fuel_quota_l, depot)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO NOTHING""",
                    (row["vehicle_id"], row["type"], row["temp"],
                     row["weight_cap_kg"], row["volume_cap_m3"], row["fuel_type"],
                     row["km_per_l"], row["weekly_fuel_quota_l"], row["depot"]),
                )

            for row in rows("calendar.csv"):
                cursor.execute(
                    """INSERT INTO operating_calendar
                       (date, dow, iso_year, iso_week, is_payday, festival,
                        festival_ramp, is_holiday, monsoon, is_operating)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (date) DO NOTHING""",
                    (row["date"], row["dow"], row["iso_year"], row["iso_week"],
                     row["is_payday"] == "1", row["festival"] or None,
                     row["festival_ramp"], row["is_holiday"] == "1",
                     row["monsoon"] == "1", row["is_operating"] == "1"),
                )

            for row in rows("district_travel.csv"):
                cursor.execute(
                    """INSERT INTO district_travel
                       (district, depot, road_class, free_flow_kmh,
                        depot_to_district_km, depot_to_district_freeflow_min,
                        inter_stop_km, inter_stop_freeflow_min)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (district) DO NOTHING""",
                    (row["district"], row["depot"], row["road_class"],
                     row["free_flow_kmh"], row["depot_to_district_km"],
                     row["depot_to_district_freeflow_min"], row["inter_stop_km"],
                     row["inter_stop_freeflow_min"]),
                )

            for row in rows("service_allowance.csv"):
                cursor.execute(
                    """INSERT INTO service_allowance
                       (brand, dock_type, service_allowance_min)
                       VALUES (%s,%s,%s)
                       ON CONFLICT (brand, dock_type) DO NOTHING""",
                    (row["brand"], row["dock_type"], row["service_allowance_min"]),
                )

            demo_password = os.environ["DEMO_PASSWORD"]
            for username, display_name, role, depot, outlet_id in (
                ("dispatcher", "Demo Dispatcher", "dispatcher", "Peliyagoda", None),
                ("loader", "Demo Loader", "loader", "Peliyagoda", None),
                ("driver", "Demo Driver", "driver", "Peliyagoda", None),
                ("store", "Demo Store Manager", "store_manager", None, "OUT001"),
            ):
                cursor.execute(
                    """INSERT INTO users
                       (username, password_hash, display_name, role, depot, outlet_id)
                       VALUES (%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (username) DO NOTHING""",
                    (username, hash_password(demo_password), display_name,
                     role, depot, outlet_id),
                )

            for row in rows("demo_orders.csv"):
                cursor.execute(
                    """INSERT INTO orders
                       (id, order_date, outlet_id, brand, temp_requirement,
                        order_units, order_weight_kg, order_volume_m3,
                        window_open_time, window_close_time, historical_outcome)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO NOTHING""",
                    (row["delivery_id"], row["order_date"], row["outlet_id"],
                     row["brand"], row["temp_requirement"], row["order_units"],
                     row["order_weight_kg"], row["order_volume_m3"],
                     row["window_open_time"], row["window_close_time"],
                     row["dispatch_status"]),
                )

            counts = {}
            for table in ("outlets", "vehicles", "operating_calendar", "users", "orders"):
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                counts[table] = cursor.fetchone()[0]
            assert counts["outlets"] == 120, counts
            assert counts["vehicles"] == 60, counts
            assert counts["orders"] >= 134, counts
            assert counts["users"] == 4, counts
            print(f"Seed complete for {DEMO_DATE}: {counts}")


if __name__ == "__main__":
    seed()
