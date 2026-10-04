"""Deterministic feasibility checks for the assisted dispatcher planner."""

from __future__ import annotations

from datetime import date, time

from fastapi import HTTPException
from psycopg.rows import dict_row


def minutes(value: time | str) -> int:
    if isinstance(value, time):
        return value.hour * 60 + value.minute
    hour, minute = str(value)[:5].split(":")
    return int(hour) * 60 + int(minute)


def fetch_order(cursor, order_id: str):
    cursor.execute(
        """SELECT o.*, x.district, x.depot, x.dock_type, x.parking_constraint,
                  x.mall_window
           FROM orders o JOIN outlets x ON x.id = o.outlet_id
           WHERE o.id = %s""",
        (order_id,),
    )
    return cursor.fetchone()


def trip_orders(cursor, trip_id: str):
    cursor.execute(
        """SELECT o.id FROM trip_stop_orders tso
           JOIN trip_stops s ON s.id = tso.stop_id
           JOIN orders o ON o.id = tso.order_id
           WHERE s.trip_id = %s ORDER BY s.sequence, o.id""",
        (trip_id,),
    )
    return [fetch_order(cursor, row["id"]) for row in cursor.fetchall()]


def window(order):
    opens = minutes(order["window_open_time"])
    closes = minutes(order["window_close_time"])
    if order["brand"] == "Fresh":
        closes = min(closes, 8 * 60)
    if order["mall_window"]:
        mall_open, mall_close = order["mall_window"].split("-", 1)
        opens = max(opens, minutes(mall_open))
        closes = min(closes, minutes(mall_close))
    if opens > closes:
        raise HTTPException(422, f"{order['id']}: delivery windows do not overlap")
    return opens, closes


def route_metrics(cursor, orders, departure_time):
    if not orders:
        return 0, minutes(departure_time), []
    district = orders[0]["district"]
    cursor.execute("SELECT * FROM district_travel WHERE district = %s", (district,))
    travel = cursor.fetchone()
    if travel is None:
        raise HTTPException(422, f"No travel reference for {district}")
    # An outlet with two orders is one physical stop. Retain the entered order.
    grouped = {}
    for order in orders:
        grouped.setdefault(order["outlet_id"], []).append(order)
    current = minutes(departure_time) + float(travel["depot_to_district_freeflow_min"])
    arrivals = []
    for index, (outlet_id, stop_orders) in enumerate(grouped.items()):
        if index:
            current += float(travel["inter_stop_freeflow_min"])
        opens = max(window(order)[0] for order in stop_orders)
        closes = min(window(order)[1] for order in stop_orders)
        current = max(current, opens)
        if current > closes:
            raise HTTPException(422, f"{outlet_id}: planned arrival misses delivery window")
        arrivals.append((outlet_id, int(current)))
        cursor.execute(
            "SELECT service_allowance_min FROM service_allowance WHERE brand = %s AND dock_type = %s",
            (stop_orders[0]["brand"], stop_orders[0]["dock_type"]),
        )
        allowance = cursor.fetchone()
        if allowance is None:
            raise HTTPException(422, f"No service allowance for {outlet_id}")
        current += allowance["service_allowance_min"]
    distance = 2 * float(travel["depot_to_district_km"])
    distance += max(0, len(grouped) - 1) * float(travel["inter_stop_km"])
    end = current + float(travel["depot_to_district_freeflow_min"])
    return distance, end, arrivals


def validate_trip(cursor, vehicle_id: str, trip_date: date, departure_time: time,
                  orders, exclude_trip_id: str | None = None):
    cursor.execute("SELECT * FROM vehicles WHERE id = %s FOR UPDATE", (vehicle_id,))
    vehicle = cursor.fetchone()
    if vehicle is None:
        raise HTTPException(404, "Vehicle not found")
    if vehicle["status"] not in ("available", "loading"):
        raise HTTPException(422, "Vehicle is unavailable")
    if not orders:
        raise HTTPException(422, "A trip needs at least one order")
    if any(order["order_date"] != trip_date for order in orders):
        raise HTTPException(422, "Orders must be for the trip date")
    if any(order["depot"] != vehicle["depot"] for order in orders):
        raise HTTPException(422, "Vehicle and orders must share a home depot")
    if len({order["district"] for order in orders}) > 1:
        raise HTTPException(422, "Keep a trip within one district")
    if len({order["brand"] for order in orders}) > 1:
        raise HTTPException(422, "Keep a trip within one brand")
    if any(order["parking_constraint"] == "van_only" for order in orders) and vehicle["type"] != "van":
        raise HTTPException(422, "A van-only outlet cannot be served by a truck")
    if any(order["temp_requirement"] == "chilled" for order in orders) and vehicle["temp"] != "reefer":
        raise HTTPException(422, "Chilled orders require a refrigerated vehicle")
    if sum(float(order["order_weight_kg"]) for order in orders) > float(vehicle["weight_cap_kg"]):
        raise HTTPException(422, "Trip exceeds vehicle weight capacity")
    if sum(float(order["order_volume_m3"]) for order in orders) > float(vehicle["volume_cap_m3"]):
        raise HTTPException(422, "Trip exceeds vehicle volume capacity")

    cursor.execute("SELECT is_operating FROM operating_calendar WHERE date = %s", (trip_date,))
    calendar = cursor.fetchone()
    if calendar is None or not calendar["is_operating"]:
        raise HTTPException(422, "The trip date is not an operating day")

    distance, end, arrivals = route_metrics(cursor, orders, departure_time)
    cursor.execute(
        "SELECT id, trip_date, departure_time FROM trips WHERE vehicle_id = %s",
        (vehicle_id,),
    )
    other_trips = [row for row in cursor.fetchall() if row["id"] != exclude_trip_id]
    same_day = [row for row in other_trips if row["trip_date"] == trip_date]
    if len(same_day) >= 2:
        raise HTTPException(422, "Vehicle already has two trips on this day")
    start = minutes(departure_time)
    for other in same_day:
        other_orders = trip_orders(cursor, other["id"])
        _, other_end, _ = route_metrics(cursor, other_orders, other["departure_time"])
        other_start = minutes(other["departure_time"])
        if start < other_end and other_start < end:
            raise HTTPException(422, f"Trip overlaps {other['id']} for this vehicle")

    iso_year, iso_week, _ = trip_date.isocalendar()
    weekly_distance = distance
    for other in other_trips:
        year, week, _ = other["trip_date"].isocalendar()
        if (year, week) == (iso_year, iso_week):
            other_orders = trip_orders(cursor, other["id"])
            other_distance, _, _ = route_metrics(cursor, other_orders, other["departure_time"])
            weekly_distance += other_distance
    litres = weekly_distance / float(vehicle["km_per_l"])
    if litres > float(vehicle["weekly_fuel_quota_l"]):
        raise HTTPException(422, "Trips exceed the vehicle's weekly fuel quota")
    return {"distance_km": round(distance, 1), "fuel_l": round(litres, 2),
            "arrivals": arrivals, "return_minute": int(end)}
