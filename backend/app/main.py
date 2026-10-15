"""
SmartWaste AI – FastAPI Backend
Run with:  uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.models import *  # noqa – ensures all models are registered
from app.seed import seed_all
from app.routes import auth, bins, readings, alerts, priority, routes, plans, analytics, simulation

app = FastAPI(
    title="SmartWaste AI API",
    description="""
## SmartWaste AI – Smart Waste Collection & Monitoring System

### Authentication
All endpoints (except `/api/auth/login`) require a Bearer token.

**Demo credentials:**
| Role               | Username   | Password  |
|--------------------|------------|-----------|
| Admin              | admin      | admin123  |
| Operations Manager | ops_mgr    | ops123    |
| Supervisor         | supervisor | sup123    |

POST `/api/auth/login` → returns `access_token`
Use as `Authorization: Bearer <token>`
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB init ───────────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(bins.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(priority.router)
app.include_router(routes.router)
app.include_router(plans.router)
app.include_router(analytics.router)
app.include_router(simulation.router)


@app.get("/", tags=["health"])
def root():
    return {
        "service": "SmartWaste AI API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
