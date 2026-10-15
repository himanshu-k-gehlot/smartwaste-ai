from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SimulationStateOut, SimulationControl
from app.auth import get_current_user, require_role
from app.models import User
import app.simulation as sim_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.get("", response_model=dict)
def get_status(current_user: User = Depends(get_current_user)):
    return sim_engine.get_simulation_status()


@router.post("/control", response_model=dict)
def control_simulation(
    body: SimulationControl,
    current_user: User = Depends(require_role("admin", "operations_manager")),
):
    action = body.action.lower()
    if action == "start":
        sim_engine.start_simulation(
            speed_multiplier=body.speed_multiplier or 1.0,
            fill_rate=body.fill_rate_pct_per_tick or 2.0,
        )
        return {"message": "Simulation started", "status": "running"}
    elif action == "pause":
        sim_engine.pause_simulation()
        return {"message": "Simulation paused", "status": "paused"}
    elif action == "reset":
        sim_engine.reset_simulation()
        return {"message": "Simulation reset", "status": "stopped"}
    else:
        from fastapi import HTTPException
        raise HTTPException(400, f"Unknown action: {action}. Use start|pause|reset")
