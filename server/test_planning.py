"""Core planner checks against a representative seeded Fresh order."""

import unittest
from datetime import date, time

from fastapi import HTTPException

from planning import validate_trip


class FixtureCursor:
    def __init__(self, vehicle=None):
        self.vehicle = vehicle or {
            "id": "VEH035", "type": "van", "temp": "reefer", "depot": "Peliyagoda",
            "status": "available", "weight_cap_kg": 1040, "volume_cap_m3": 7,
            "km_per_l": 8, "weekly_fuel_quota_l": 100,
        }
        self.result = None

    def execute(self, sql, params=None):
        query = " ".join(sql.upper().split())
        if "FROM VEHICLES" in query:
            self.result = self.vehicle
        elif "FROM OPERATING_CALENDAR" in query:
            self.result = {"is_operating": True}
        elif "FROM DISTRICT_TRAVEL" in query:
            self.result = {"depot_to_district_freeflow_min": 24, "inter_stop_freeflow_min": 8,
                           "depot_to_district_km": 12, "inter_stop_km": 4}
        elif "FROM SERVICE_ALLOWANCE" in query:
            self.result = {"service_allowance_min": 20}
        elif "FROM TRIPS" in query:
            self.result = []
        else:
            raise AssertionError(f"Unexpected SQL: {sql}")

    def fetchone(self):
        return self.result

    def fetchall(self):
        return self.result


class PlanningTests(unittest.TestCase):
    def setUp(self):
        self.order = {
            "id": "ORD0088667", "order_date": date(2026, 1, 16),
            "outlet_id": "OUT001", "brand": "Fresh", "district": "Colombo",
            "depot": "Peliyagoda", "dock_type": "street", "parking_constraint": "van_only",
            "mall_window": None, "window_open_time": "05:00", "window_close_time": "07:30",
            "temp_requirement": "ambient", "order_weight_kg": 109.5, "order_volume_m3": 0.589,
        }

    def validate(self, cursor=None, order=None, departure=time(4, 0)):
        return validate_trip(cursor or FixtureCursor(), "VEH035", date(2026, 1, 16),
                             departure, [order or self.order])

    def test_valid_van_trip_waits_for_window_and_counts_return_fuel(self):
        result = self.validate()
        self.assertEqual(result["arrivals"], [("OUT001", 300)])
        self.assertEqual(result["distance_km"], 24)
        self.assertEqual(result["fuel_l"], 3)

    def test_rejects_chilled_order_on_ambient_vehicle(self):
        vehicle = {**FixtureCursor().vehicle, "temp": "ambient"}
        with self.assertRaisesRegex(HTTPException, "refrigerated"):
            self.validate(FixtureCursor(vehicle), {**self.order, "temp_requirement": "chilled"})

    def test_rejects_truck_at_van_only_outlet(self):
        vehicle = {**FixtureCursor().vehicle, "type": "truck"}
        with self.assertRaisesRegex(HTTPException, "van-only"):
            self.validate(FixtureCursor(vehicle))

    def test_rejects_weight_and_late_arrival(self):
        with self.assertRaisesRegex(HTTPException, "weight"):
            self.validate(order={**self.order, "order_weight_kg": 1200})
        with self.assertRaisesRegex(HTTPException, "window"):
            self.validate(departure=time(7, 20))

    def test_rejects_weekly_fuel_quota(self):
        vehicle = {**FixtureCursor().vehicle, "weekly_fuel_quota_l": 2}
        with self.assertRaisesRegex(HTTPException, "fuel quota"):
            self.validate(FixtureCursor(vehicle))


if __name__ == "__main__":
    unittest.main()
