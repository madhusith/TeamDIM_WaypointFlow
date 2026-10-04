"""Exercise one complete four-role delivery against a running Compose stack.

Usage: python server/smoke_walkthrough.py [http://localhost:8080] [vehicle_id]
This adds demo orders and a trip to the connected database.
"""

import json
import os
import sys
import urllib.error
import urllib.request
import uuid


BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
PASSWORD = os.environ.get("DEMO_PASSWORD", "WaypointDemo2026!")
VEHICLE = sys.argv[2] if len(sys.argv) > 2 else None


def call(path, token=None, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(
        BASE + "/api" + path,
        data=body,
        headers={
            **({"Authorization": f"Bearer {token}"} if token else {}),
            **({"Content-Type": "application/json"} if body else {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"{path}: {error.code} {error.read().decode()}") from error


def login(username):
    return call("/login", payload={"username": username, "password": PASSWORD})["token"]


def main():
    assert call("/health")["status"] == "ok"
    tokens = {role: login(role) for role in ("store", "dispatcher", "loader", "driver")}
    baseline = call("/reference/summary", tokens["dispatcher"])
    assert baseline["outlets"] == 120 and baseline["vehicles"] == 60, baseline
    existing = call("/bootstrap", tokens["dispatcher"])
    used = {trip["vehicle_id"] for trip in existing["trips"] if trip["trip_date"] == "2026-01-16"}
    vehicle = VEHICLE or next((candidate for candidate in ("VEH035", "VEH036") if candidate not in used), None)
    if not vehicle:
        raise RuntimeError("Both compatible demo vans already have trips. Use a fresh database for this smoke test.")

    first = call("/orders", tokens["store"], {
        "order_date": "2026-01-16", "order_units": 10, "order_weight_kg": 100,
        "order_volume_m3": 0.5, "temp_requirement": "ambient",
    })["order_id"]
    second = call("/orders", tokens["store"], {
        "order_date": "2026-01-16", "order_units": 8, "order_weight_kg": 80,
        "order_volume_m3": 0.4, "temp_requirement": "chilled",
    })["order_id"]
    trip = call("/trips", tokens["dispatcher"], {
        "order_id": first, "vehicle_id": vehicle, "departure_time": "04:00",
    })["trip_id"]
    call(f"/orders/{second}/defer", tokens["dispatcher"],
         {"reason": "Compatible capacity reserved for an earlier order."})
    call(f"/trips/{trip}/publish", tokens["dispatcher"], {})
    call(f"/trips/{trip}/load-issues", tokens["loader"], {
        "order_id": first, "expected_units": 10, "actual_units": 8,
        "reason": "Two units damaged at loading dock",
    })
    call(f"/trips/{trip}/loaded", tokens["loader"], {})
    call(f"/trips/{trip}/depart", tokens["driver"], {})
    snapshot = call("/bootstrap", tokens["driver"])
    stop = next(item for item in snapshot["stops"] if item["trip_id"] == trip)
    for kind in ("arrived", "delivered"):
        call(f"/stops/{stop['id']}/events", tokens["driver"], {
            "client_event_id": str(uuid.uuid4()), "event_type": kind,
            "happened_at": "2026-01-16T05:05:00+05:30",
            "receiver_name": "Smoke Test Receiver" if kind == "delivered" else None,
            "notes": "Eight units delivered" if kind == "delivered" else None,
        })
    call(f"/orders/{first}/receipt", tokens["store"], {
        "received_units": 8, "issue": "Two units missing as reported at loading",
    })
    final = call("/bootstrap", tokens["dispatcher"])
    by_id = {order["id"]: order for order in final["orders"]}
    assert by_id[first]["status"] == "receipt_confirmed", by_id[first]
    assert by_id[second]["status"] == "deferred", by_id[second]
    assert any(item["id"] == trip and item["status"] == "completed" for item in final["trips"])
    print(f"PASS: {first} delivered and received; {second} deferred; {trip} completed")


if __name__ == "__main__":
    main()
