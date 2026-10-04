# WaypointFlow

TeamDIM's Hackathon implementation of the Waypoint Group delivery workflow.

## Current milestone

The Hackathon UI now signs in to one of four seeded accounts and uses a shared FastAPI/PostgreSQL workflow. It supports store orders, dispatcher allocation and deferral, loader shortfalls, driver delivery records with offline replay, and store receipt confirmation. The original Designathon pages remain in `src/pages/` for reference, while the active workflow is in `src/hackathon/`.

The full Docker stack was built and started on October 3. A four-role walkthrough passed through its Nginx/API path on port 8080 against PostgreSQL, and frontend production build, API import, planner unit checks, Python compilation, and Compose configuration parsing passed. Public deployment and a fresh-install walkthrough remain to be verified before submission.

## Start the complete stack

Install Docker Desktop or Docker Engine with Compose, then run from the repository root:

```sh
docker compose up
```

The first run builds the web and API images, starts PostgreSQL, creates the schema, and imports the bundled synthetic seed data. Subsequent runs keep database state in the `postgres_data` volume and seed only missing records.

- Web UI: <http://localhost:8080>
- API health: <http://localhost:8080/api/health>
- API documentation: <http://localhost:8080/api/docs>

Copy `.env.example` to `.env` to override the local demo defaults. Set strong `POSTGRES_PASSWORD`, `APP_SECRET`, and `DEMO_PASSWORD` before public deployment. The defaults exist so a fresh `docker compose up` works without configuration.

### Four seeded demo accounts

| Username | Role | Demo password |
| --- | --- | --- |
| `dispatcher` | Dispatcher | `WaypointDemo2026!` |
| `loader` | Loader | `WaypointDemo2026!` |
| `driver` | Driver | `WaypointDemo2026!` |
| `store` | Store manager for `OUT001` | `WaypointDemo2026!` |

The web app uses `POST /api/login`. The same endpoint can be checked directly:

```sh
curl -X POST http://localhost:8080/api/login -H "Content-Type: application/json" -d '{"username":"dispatcher","password":"WaypointDemo2026!"}'
```

Use the returned bearer token for `GET /api/me`, `GET /api/reference/summary`, and `GET /api/orders`. Store managers see only their outlet's orders on the orders endpoint.

## Numbered judge walkthrough

Use the fixed **January 16, 2026** demo day. This is a simulation using the organizer's historical operating calendar; the normal 16:00 Sri Lanka cutoff applies to non-demo orders. The steps below assume a fresh database. Smoke runs add orders and occupy demo vans; on a reused database, inspect the completed trips already shown in the dashboard or start with a fresh test volume.

1. Run `docker compose up` and open <http://localhost:8080>. Sign in as `store`. Place **two** orders for `OUT001`, for example 10 ambient units at 100 kg / 0.5 m³ and 8 chilled units at 80 kg / 0.4 m³. Note their generated `ORD-DEMO-...` IDs.
2. Switch account to `dispatcher`. Search for the first new order. Create a trip with refrigerated van `VEH035` departing at **04:00**. The planner should accept the van-only outlet and schedule arrival at 05:00. Search for the second order and defer it with a reason. Publish the draft trip.
3. Switch to `store` and confirm that the second order displays its deferral reason and the first displays its expected arrival.
4. Switch to `loader`. Open the published trip. Optionally flag a shortfall on the first order, then check its line or record the shortfall and complete loading.
5. Switch to `driver`. Depart the loaded trip. Turn on **Simulate offline**, record arrival and delivery with a receiver name and optional proof photo. Turn the offline switch off and wait for the pending count to return to zero.
6. Switch to `store`. Open the delivered first order, enter units received, add an issue if needed, and confirm receipt.
7. Switch to `dispatcher` to inspect the completed trip and any loading or receipt exceptions.

The API rejects incompatible vehicles, weight or volume overload, missed windows, non-operating dates, overlapping or excess trips, and weekly fuel overuse. Try assigning the chilled order to an ambient van to see a validation error.

## Seed data

`server/seed_data/` contains the supplied synthetic outlet, vehicle, calendar, district travel, and service allowance tables. `demo_orders.csv` contains the 134 orders for **January 16, 2026**, an operating day covering Fresh, Style, and Tech with historical deferred orders. All orders start as `confirmed` in the interactive database; `historical_outcome` is retained only as source context. The dataset calendar ends in June 2026, so the judge demo uses a fixed historical date.

To regenerate these files from the organizer's ZIP:

```sh
python server/prepare_data.py path/to/data.zip
```

The original 92,307-row training file and Datathon test files are deliberately excluded from app startup.

## Significant implementation departures and remaining work

The cloned Designathon frontend switched roles inside one browser and stored mock data locally. The active Hackathon view uses account sign-in and a shared API; its role flows are consolidated into four role dashboards. The Designathon submission was a YouTube video, and no export or video URL is available in this workspace. The cloned frontend is the visual reference; review the submitted video against these screens before the deadline if the URL becomes available.

Loader checklist ticks currently live only in the active browser session; completion and shortage reports are stored in PostgreSQL. The driver offline queue is kept in browser local storage and replays idempotent events on reconnect. The full Docker stack was built and started on October 3; a second four-role smoke walkthrough passed through Nginx at port 8080 against the persistent database. A public deployment, final AI disclosure, and demo video remain to be completed.

See [architecture](docs/architecture.md), [data model](docs/data-model.md), and the [working AI disclosure](docs/ai-disclosure.md).
