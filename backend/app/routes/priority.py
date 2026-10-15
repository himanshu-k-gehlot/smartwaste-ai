"""
Priority engine: computes a weighted priority score for each bin.

Score formula (0-100):
  fill_weight    = 0.50 * fill_level
  temp_weight    = 0.20 * clamp(temperature - 25, 0, 45) / 45 * 100
  battery_weight = 0.15 * (100 - battery_level)
  age_weight     = 0.15 * clamp(hours_since_collected, 0, 72) / 72 * 100

Priority levels:
  score >= 75  → critical
  score >= 50  → high
  score >= 25  → medium
  else         → low
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Bin, Zone
from app.schemas import BinPriority
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/priority", tags=["priority"])


def compute_priority(b: Bin) -> tuple[float, str]:
    fill_score = 0.50 * b.fill_level
    temp_norm = min(max(b.temperature - 25, 0), 45) / 45 * 100
    temp_score = 0.20 * temp_norm
    battery_score = 0.15 * (100 - b.battery_level)

    if b.last_collected:
        hours = (datetime.utcnow() - b.last_collected.replace(tzinfo=None)).total_seconds() / 3600
    else:
        hours = 48
    age_score = 0.15 * min(hours, 72) / 72 * 100

    total = fill_score + temp_score + battery_score + age_score

    if total >= 75:
        level = "critical"
    elif total >= 50:
        level = "high"
    elif total >= 25:
        level = "medium"
    else:
        level = "low"

    return round(total, 2), level


@router.get("", response_model=List[BinPriority])
def get_priorities(
    zone_id: Optional[int] = Query(None),
    min_score: Optional[float] = Query(None),
    level: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Bin).filter(Bin.is_active == True)
    if zone_id:
        q = q.filter(Bin.zone_id == zone_id)
    bins = q.all()

    results: List[BinPriority] = []
    for b in bins:
        score, lvl = compute_priority(b)
        if min_score is not None and score < min_score:
            continue
        if level and lvl != level:
            continue
        zone_name = b.zone.locality if b.zone else "Unknown"
        results.append(BinPriority(
            bin_id=b.id,
            bin_code=b.bin_code,
            zone_name=zone_name,
            fill_level=b.fill_level,
            temperature=b.temperature,
            battery_level=b.battery_level,
            waste_type=b.waste_type,
            priority_score=score,
            priority_level=lvl,
            address=b.address,
            latitude=b.latitude,
            longitude=b.longitude,
            last_collected=b.last_collected,
        ))

    results.sort(key=lambda x: x.priority_score, reverse=True)
    return results[:limit]
