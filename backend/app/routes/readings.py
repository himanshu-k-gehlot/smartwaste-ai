from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import SensorReading, Bin
from app.schemas import SensorReadingOut, SensorReadingCreate
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/readings", tags=["sensor_readings"])


@router.get("", response_model=List[SensorReadingOut])
def list_readings(
    bin_id: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SensorReading)
    if bin_id:
        q = q.filter(SensorReading.bin_id == bin_id)
    return q.order_by(SensorReading.recorded_at.desc()).limit(limit).all()


@router.post("", response_model=SensorReadingOut, status_code=201)
def create_reading(
    body: SensorReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Push a real hardware reading (or simulated) from ESP32 / HTTP client."""
    bin_obj = db.query(Bin).filter(Bin.id == body.bin_id).first()
    if not bin_obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Bin not found")

    reading = SensorReading(**body.model_dump())
    db.add(reading)

    # Update bin live status
    bin_obj.fill_level = body.fill_level
    if body.temperature is not None:
        bin_obj.temperature = body.temperature
    if body.battery_level is not None:
        bin_obj.battery_level = body.battery_level
    from datetime import datetime
    bin_obj.last_reading_at = datetime.utcnow()

    # Update status
    from app.simulation import _derive_status
    bin_obj.status = _derive_status(bin_obj.fill_level, bin_obj.battery_level, bin_obj.temperature)

    db.commit()
    db.refresh(reading)
    return reading
