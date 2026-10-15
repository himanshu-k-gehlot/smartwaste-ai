# SmartWaste AI — Complete Run Guide & Testing Checklist

## Project Structure

```
Smart Waste Collection AI/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── database.py       # SQLite DB connection
│   │   ├── seed.py           # Realistic sample data seeder
│   │   ├── simulation.py     # Background sensor simulation engine
│   │   ├── auth.py           # JWT auth helpers
│   │   └── routes/           # API route modules
│   │       ├── auth.py       # POST /api/auth/login, GET /api/auth/me
│   │       ├── bins.py       # GET/PATCH /api/bins
│   │       ├── readings.py   # GET/POST /api/readings
│   │       ├── alerts.py     # GET/PATCH /api/alerts
│   │       ├── priority.py   # GET /api/priority
│   │       ├── routes.py     # GET /api/routes, /api/routes/optimise
│   │       ├── plans.py      # GET/POST/PATCH /api/plans
│   │       ├── analytics.py  # GET /api/analytics/kpi etc.
│   │       └── simulation.py # GET/POST /api/simulation/control
│   ├── requirements.txt
│   └── smartwaste.db         # SQLite database (auto-created)
│
└── frontend/                 # React + Vite + TypeScript + Tailwind
    ├── src/
    │   ├── App.tsx
    │   ├── pages/            # 11 pages
    │   ├── components/       # Layout, Sidebar, UI primitives
    │   ├── api/              # Axios client + all endpoint functions
    │   ├── context/          # AuthContext (JWT)
    │   └── types/            # TypeScript interfaces
    ├── package.json
    └── vite.config.ts        # Proxy /api → localhost:8000
```

---

## Prerequisites

| Tool        | Version   | Install                          |
|-------------|-----------|----------------------------------|
| Python      | 3.11+     | python.org                       |
| Node.js     | 18+       | nodejs.org                       |
| npm         | 8+        | bundled with Node                |

---

## 1 — Run the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

- API docs (Swagger UI): http://localhost:8000/docs
- API docs (ReDoc):      http://localhost:8000/redoc
- Health check:          http://localhost:8000/health

The database (`smartwaste.db`) is auto-created and seeded with **79 bins across 6 zones** on first run.

---

## 2 — Run the Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

**Expected output:**
```
  VITE v6.x  ready in Xms
  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

---

## 3 — Demo Login Credentials

| Role               | Username   | Password   | Access Level                              |
|--------------------|------------|------------|-------------------------------------------|
| **Admin**          | admin      | admin123   | Full access — all features + simulation   |
| **Ops Manager**    | ops_mgr    | ops123     | Plans, alerts, simulation, reports        |
| **Supervisor**     | supervisor | sup123     | Read-only dashboards, resolve own alerts  |

---

## 4 — API Quick Reference

### Authentication
```bash
# Login (returns JWT)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response:
# {"access_token": "eyJ...", "token_type": "bearer", "role": "admin", "full_name": "Admin User"}
```

All subsequent requests need: `Authorization: Bearer <access_token>`

### Key Endpoints

| Method | Endpoint                            | Description                          |
|--------|-------------------------------------|--------------------------------------|
| GET    | `/api/analytics/kpi`                | Live KPI stats (bins, alerts, etc.)  |
| GET    | `/api/bins?status=critical`         | Filter bins by status                |
| GET    | `/api/alerts?is_resolved=false`     | Active alerts                        |
| PATCH  | `/api/alerts/{id}/resolve`          | Resolve an alert                     |
| GET    | `/api/priority`                     | Prioritised bin list (scored 0–100)  |
| GET    | `/api/routes/optimise?min_fill=50`  | AI-optimised routes                  |
| POST   | `/api/plans`                        | Create collection plan               |
| GET    | `/api/analytics/fill-trend?hours=24`| Fill level trend data                |
| POST   | `/api/readings`                     | Push sensor reading (ESP32 endpoint) |
| POST   | `/api/simulation/control`           | Start/pause/reset simulation         |

### Simulation Control
```bash
TOKEN="your_token_here"

# Start simulation (2x speed, 3% fill per tick)
curl -X POST http://localhost:8000/api/simulation/control \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"start","speed_multiplier":2,"fill_rate_pct_per_tick":3}'

# Pause
curl -X POST http://localhost:8000/api/simulation/control \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"pause"}'

# Reset all bins to baseline
curl -X POST http://localhost:8000/api/simulation/control \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"reset"}'
```

### Push Real Sensor Reading (ESP32 or HTTP client)
```bash
curl -X POST http://localhost:8000/api/readings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bin_id":1,"fill_level":72.5,"temperature":31.2,"battery_level":85.0,"is_simulated":false}'
```

---

## 5 — Manual Testing Checklist

### Authentication & Access
- [ ] Navigate to http://localhost:5173 → should redirect to `/login`
- [ ] Login with wrong password → error message shown
- [ ] Login as `admin` / `admin123` → lands on Dashboard
- [ ] Login as `supervisor` / `sup123` → cannot start simulation (403 blocked)
- [ ] Logout via sidebar → redirects to login

### Dashboard
- [ ] KPI cards show real numbers (total_bins = 79)
- [ ] "24h Fill Level Trend" chart renders with data points
- [ ] "Waste Type Distribution" pie chart shows 5 segments
- [ ] "Zone Fill Level Comparison" bar chart shows 6 zones
- [ ] "Recent Active Alerts" list shows alerts
- [ ] Refresh button triggers re-fetch

### Live Monitoring
- [ ] OpenStreetMap loads with bin markers
- [ ] Green/yellow/red circles visible by status
- [ ] Clicking a bin opens popup with fill%, temp, battery
- [ ] Filter buttons (Normal/Warning/Critical) show correct counts
- [ ] Selected bin detail panel appears on right

### Smart Bins
- [ ] Table shows 79 bins with pagination
- [ ] Search by bin code (e.g. "BIN-0001") filters results
- [ ] Filter by status = "critical" shows only critical bins
- [ ] "Mark Collected" button updates fill to 5% and refreshes

### Alerts
- [ ] Active alerts listed with severity badges
- [ ] "Resolve" button on individual alert works
- [ ] "Resolve All" clears all active alerts (requires admin/ops_mgr)
- [ ] Toggle "Show resolved" reveals resolved history
- [ ] Alert count in sidebar badge updates

### Priority Analysis
- [ ] Priority scores shown 0–100
- [ ] Bar chart shows top 15 bins by score
- [ ] Filter by "critical" level shows only critical-priority bins
- [ ] Score formula displayed in subtitle

### Route Planner
- [ ] Map loads with coloured route lines per zone
- [ ] Left panel lists 6 optimised routes
- [ ] Clicking a route highlights it on the map
- [ ] Bin sequence list shows numbered stops
- [ ] Changing min fill % reruns optimisation

### Collection Plans
- [ ] Existing plans listed with status badges
- [ ] "New Plan" form creates a plan (admin/ops_mgr only)
- [ ] Status dropdown changes plan status
- [ ] Progress bar reflects bins_collected / total_bins

### Analytics
- [ ] 24h Area chart renders
- [ ] 7-day Line chart renders
- [ ] Zone performance bar chart renders
- [ ] Waste type pie chart renders
- [ ] Collection history bar chart (30 days) renders

### IoT Sensors / Simulation
- [ ] Simulation status shows "stopped" initially
- [ ] "Start" button (admin/ops_mgr) starts simulation
- [ ] After 30s, refresh Dashboard — fill levels change
- [ ] "Pause" stops simulation
- [ ] "Reset" restores bins to baseline fill levels
- [ ] ESP32 code snippet visible

### Reports
- [ ] Executive Summary table shows live stats
- [ ] Zone report table lists all 6 zones
- [ ] Charts render with data
- [ ] "Print / Export" triggers browser print dialog
- [ ] Disclaimer note mentions simulated data

### Settings
- [ ] Current user info displayed
- [ ] Role permissions listed correctly per role
- [ ] API Documentation section lists all endpoints
- [ ] Link to http://localhost:8000/docs opens Swagger UI

---

## 6 — Known Limitations (No Fake Claims)

1. **No real hardware** — All sensor data is simulated. Physical ESP32 integration requires flashing the Arduino sketch and configuring the server IP.
2. **SQLite** — Not suitable for production concurrency. Replace with PostgreSQL for multi-user deployments.
3. **No HTTPS** — Run behind nginx/caddy with TLS in production.
4. **JWT secret** — Hardcoded in `auth.py`. Must be moved to environment variable for production.
5. **Map tiles** — Requires internet connection for OpenStreetMap tiles.
6. **No push notifications** — Alerts are polled every 20–30s, not pushed via WebSocket.
7. **No email/SMS alerts** — Out of scope for this prototype.
8. **Role enforcement** — Frontend hides UI elements; backend enforces via `require_role()` decorator.

---

## 7 — Production Deployment Notes

```bash
# Backend (production)
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Frontend (build static files, serve with nginx)
npm run build
# Serve dist/ folder via nginx
```

---

*SmartWaste AI v1.0.0 — Built for municipal corporations and local contractors.*
