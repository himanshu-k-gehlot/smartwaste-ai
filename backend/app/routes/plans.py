from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import CollectionPlan, RouteAssignment, Route, Vehicle
from app.schemas import CollectionPlanOut, CollectionPlanCreate
from app.auth import get_current_user, require_role
from app.models import User

router = APIRouter(prefix="/api/plans", tags=["collection_plans"])


@router.get("", response_model=List[CollectionPlanOut])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(CollectionPlan).order_by(CollectionPlan.scheduled_date.desc()).all()


@router.get("/{plan_id}", response_model=CollectionPlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(CollectionPlan).filter(CollectionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    return plan


@router.post("", response_model=CollectionPlanOut, status_code=201)
def create_plan(
    body: CollectionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "operations_manager")),
):
    import random, string
    code = "CP-" + "".join(random.choices(string.digits, k=6))
    routes = db.query(Route).all()
    vehicles = db.query(Vehicle).filter(Vehicle.is_available == True).all()

    plan = CollectionPlan(
        plan_code=code,
        name=body.name,
        scheduled_date=body.scheduled_date,
        status="planned",
        total_routes=len(routes),
        total_bins_target=sum(r.total_bins for r in routes),
        total_bins_collected=0,
        notes=body.notes,
        created_by=current_user.username,
    )
    db.add(plan)
    db.flush()

    for i, route in enumerate(routes):
        v = vehicles[i % len(vehicles)] if vehicles else None
        db.add(RouteAssignment(
            route_id=route.id,
            vehicle_id=v.id if v else None,
            plan_id=plan.id,
            scheduled_start=body.scheduled_date.replace(hour=6),
            status="pending",
        ))

    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/{plan_id}/status", response_model=CollectionPlanOut)
def update_plan_status(
    plan_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "operations_manager")),
):
    plan = db.query(CollectionPlan).filter(CollectionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    plan.status = status
    db.commit()
    db.refresh(plan)
    return plan
