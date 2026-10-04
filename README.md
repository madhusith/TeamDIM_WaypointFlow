# WaypointFlow

TeamDIM's Hackathon implementation of the Waypoint Group delivery logistics workflow.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue?style=for-the-badge&logo=vercel)](https://waypoint-flow.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Railway-purple?style=for-the-badge&logo=railway)](https://teamdimwaypointflow-production.up.railway.app/api/health)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

---

## 🚀 Live Public Deployment

- **Frontend Web UI**: [https://waypoint-flow.vercel.app](https://waypoint-flow.vercel.app)
- **Backend API**: [https://teamdimwaypointflow-production.up.railway.app](https://teamdimwaypointflow-production.up.railway.app)
- **API Health Check**: [https://teamdimwaypointflow-production.up.railway.app/api/health](https://teamdimwaypointflow-production.up.railway.app/api/health)
- **Interactive OpenAPI Docs**: [https://teamdimwaypointflow-production.up.railway.app/api/docs](https://teamdimwaypointflow-production.up.railway.app/api/docs)

---

## 🔑 Demo Access (Four Seeded Role Accounts)

The demo environment runs against a shared interactive PostgreSQL instance pre-seeded with synthetic reference data (outlets, vehicles, districts, operating calendar) and 134 demo orders for **January 16, 2026**.

| Role | Username | Password | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Dispatcher** | `dispatcher` | `WaypointDemo2026!` | Trip planning, constraint validation, vehicle assignment, deferral logging |
| **Loader** | `loader` | `WaypointDemo2026!` | Reverse stop order loading lists, checklist verification, shortfall flagging |
| **Driver** | `driver` | `WaypointDemo2026!` | Route navigation, offline delivery mode, receiver signature & proof photo capture |
| **Store Manager** | `store` | `WaypointDemo2026!` | Order creation (`OUT001`), delivery ETA tracking, receipt confirmation & issues |

---

## 🧭 Numbered Judge Walkthrough

Follow this step-by-step walkthrough on the [Live Web UI](https://waypoint-flow.vercel.app) or locally:

1. **Store Manager: Place Orders**
   - Sign in as `store` (password: `WaypointDemo2026!`).
   - Place **two** orders for `OUT001`:
     - Order 1: `10` units ambient at `100` kg / `0.5` m³.
     - Order 2: `8` units chilled at `80` kg / `0.4` m³.
   - Note the generated `ORD-DEMO-...` order IDs.

2. **Dispatcher: Validate, Plan & Defer**
   - Click **Switch account** and sign in as `dispatcher`.
   - Search for the first new order in the queue.
   - Create a new trip with refrigerated van `VEH035` departing at **04:00**. The planning engine validates vehicle compatibility, capacity, operating calendar, and window timing, scheduling arrival at 05:00.
   - Search for the second order, select **Defer with reason**, enter a reason, and click **Record Deferral**.
   - Under **Trips and progress**, click **Publish trip** on the draft trip to release it to loading.

3. **Store Manager: Verification**
   - Switch account back to `store`.
   - Verify that the first order shows its expected arrival time (`05:00`) and the second order displays the exact deferral reason recorded by dispatch.

4. **Loader: Loading Bay Checklist & Shortfall Reporting**
   - Switch account to `loader`.
   - Select the published trip. Stops are presented in **reverse delivery order** for optimal dock loading.
   - Flag any shortfall or check off each order line, then click **Complete loading**.

5. **Driver: Offline Delivery & Proof of Delivery (PoD)**
   - Switch account to `driver`.
   - Click **Depart depot**.
   - Toggle **Simulate offline** to demonstrate offline capability.
   - Click **Mark Arrived** and **Record Delivery**:
     - Enter receiver name/signature.
     - Add delivery notes.
     - *(Optional)* Attach or capture a proof photo.
   - Click **Save proof of delivery** &mdash; the update is queued securely in browser storage.
   - Toggle offline mode off &mdash; pending events synchronize automatically to PostgreSQL.
   - The stop card dynamically displays the recorded receiver name, notes, and proof photo preview.

6. **Store Manager: Receipt Confirmation**
   - Switch back to `store`.
   - Open the delivered order, enter units received, note any damage/shortage if desired, and click **Confirm receipt**.

7. **Dispatcher: Audit Exceptions**
   - Switch to `dispatcher` to audit completed trips, loading shortfalls, and receipt issues under **Exceptions & Issues**.

---

## 🛠️ Architecture & Tech Stack

```text
┌─────────────────────────────────┐
│        Vercel (Frontend)        │
│  React 19 • Vite • TailwindCSS  │
│    Responsive Mobile/Desktop    │
└────────────────┬────────────────┘
                 │ HTTPS / JSON API
                 ▼
┌─────────────────────────────────┐
│        Railway (Backend)        │
│    FastAPI (Python) • Uvicorn   │
│   Planning Engine & Auth System │
└────────────────┬────────────────┘
                 │ TCP / SQL
                 ▼
┌─────────────────────────────────┐
│       Railway PostgreSQL        │
│  Reference Tables & Seed Data   │
│ Delivery Events & Audit History │
└─────────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Zustand, responsive UI optimized for desktop and mobile.
- **Backend**: FastAPI, Python 3.12, Psycopg 3, Pydantic, Uvicorn.
- **Database**: PostgreSQL 16 with relational schema, foreign key integrity, and transactional updates.
- **Hosting**:
  - Frontend: Vercel (Edge CDN, SPA routing via `vercel.json`)
  - Backend & Database: Railway (Containerized Dockerfile via `railway.json` + Managed PostgreSQL)
  - Local: Docker Compose (`docker-compose.yml`)

---

## 💻 Running Locally

### Option 1: Docker Compose (Complete Stack)

Install Docker Desktop and run from the repository root:

```sh
docker compose up
```

The stack automatically builds the frontend and API containers, initializes PostgreSQL, applies migrations (`schema.sql`), and seeds initial data (`seed.py`).

- Frontend: `http://localhost:8080`
- API Health: `http://localhost:8080/api/health`
- API Documentation: `http://localhost:8080/api/docs`

---

### Option 2: Local Development Server

#### Backend:
```sh
cd server
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
export DATABASE_URL="postgresql://user:password@localhost:5432/waypointflow"
python seed.py
uvicorn main:app --reload --port 8000
```

#### Frontend:
```sh
npm ci
npm run dev
```

Visit `http://localhost:5173` (Vite proxies `/api` calls to `http://localhost:8000`).

---

## ⚙️ Environment Variables

### Frontend (`.env` or Vercel Settings)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend URL for production | `https://teamdimwaypointflow-production.up.railway.app` |

### Backend (`.env` or Railway Settings)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | *Provided by Railway* |
| `APP_SECRET` | Secret key for bearer token generation | `WaypointSecret2026!` |
| `DEMO_PASSWORD` | Password for seeded demo accounts | `WaypointDemo2026!` |
| `CORS_ORIGINS` | Allowed origins for cross-origin requests | `*` (or Vercel URL) |
| `PORT` | Service port | `8000` |

---

## 📁 Repository Structure

```text
├── Dockerfile.web             # Multi-stage Docker build for frontend with Nginx
├── docker-compose.yml         # Local orchestration for Web, API, and DB
├── railway.json               # Railway deployment configuration
├── vercel.json                # Vercel SPA client rewrite configuration
├── package.json               # Frontend dependencies and build scripts
├── src/
│   ├── hackathon/             # Active interactive Hackathon application
│   │   ├── WorkflowApp.tsx    # Responsive role dashboards (Dispatcher, Loader, Driver, Store)
│   │   └── api.ts             # API client with token auth and base URL support
│   └── pages/                 # Initial visual design reference pages
├── server/
│   ├── Dockerfile             # Python 3.12 container configuration
│   ├── main.py                # FastAPI routes, auth, validation, and stop events
│   ├── planning.py            # Vehicle capability, window, capacity & route rules
│   ├── schema.sql             # Relational database schema
│   ├── seed.py                # Database population with demo seed data
│   ├── seed_data/             # Synthetic reference tables & demo day orders
│   └── test_planning.py       # Unit tests for planning & constraint rules
└── docs/                      # Architecture, data model, and AI disclosure notes
```

---

## 📄 Documentation

- [Architecture Design](docs/architecture.md)
- [Data Model & Schema](docs/data-model.md)
- [AI Disclosure](docs/ai-disclosure.md)
