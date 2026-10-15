"""
Analytics endpoints – all stats computed from live DB data.
No hard-coded numbers.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd

from app.database import get_db
from app.models import Bin, SensorReading, Alert, Zone, Vehicle, CollectionPlan
from app.schemas import KPIStats, FillTrendPoint, ZoneStats
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/kpi", response_model=KPIStats)
def get_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_bins = db.query(Bin).count()
    active_bins = db.query(Bin).filter(Bin.is_active == True).count()
    offline_bins = db.query(Bin).filter(Bin.status == "offline").count()
    bins_critical = db.query(Bin).filter(Bin.status == "critical").count()
    bins_warning = db.query(Bin).filter(Bin.status == "warning").count()
    bins_normal = db.query(Bin).filter(Bin.status == "normal").count()

    avg_fill = db.query(func.avg(Bin.fill_level)).filter(Bin.is_active == True).scalar() or 0
    avg_battery = db.query(func.avg(Bin.battery_level)).filter(Bin.is_active == True).scalar() or 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    collections_today = db.query(Bin).filter(Bin.last_collected >= today_start).count()

    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    resolved_alerts = db.query(Alert).filter(Alert.is_resolved == True).count()
    zones_count = db.query(Zone).count()
    vehicles_avail = db.query(Vehicle).filter(Vehicle.is_available == True).count()
    vehicles_total = db.query(Vehicle).count()

    efficiency = round((collections_today / max(active_bins, 1)) * 100, 1)
    efficiency = min(efficiency, 100)

    return KPIStats(
        total_bins=total_bins,
        active_bins=active_bins,
        offline_bins=offline_bins,
        bins_critical=bins_critical,
        bins_warning=bins_warning,
        bins_normal=bins_normal,
        avg_fill_level=round(avg_fill, 1),
        total_collections_today=collections_today,
        total_alerts_active=active_alerts,
        total_alerts_resolved=resolved_alerts,
        zones_count=zones_count,
        vehicles_available=vehicles_avail,
        vehicles_total=vehicles_total,
        collection_efficiency_pct=efficiency,
        avg_battery_level=round(avg_battery, 1),
    )


@router.get("/fill-trend", response_model=List[FillTrendPoint])
def fill_trend(
    hours: int = Query(24, le=168),
    bin_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q = db.query(SensorReading).filter(SensorReading.recorded_at >= since)
    if bin_id:
        q = q.filter(SensorReading.bin_id == bin_id)

    rows = q.order_by(SensorReading.recorded_at).all()
    if not rows:
        return []

    data = [{"recorded_at": r.recorded_at, "fill_level": r.fill_level} for r in rows]
    df = pd.DataFrame(data)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"])
    df = df.set_index("recorded_at")
    # Resample to 1-hour buckets
    grouped = df.resample("1h")
    result = []
    for ts, group in grouped:
        if group.empty:
            continue
        result.append(FillTrendPoint(
            recorded_at=ts.isoformat(),
            avg_fill=round(group["fill_level"].mean(), 1),
            max_fill=round(group["fill_level"].max(), 1),
            bin_count=len(group),
        ))
    return result


@router.get("/zone-stats", response_model=List[ZoneStats])
def zone_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zones = db.query(Zone).all()
    result = []
    for zone in zones:
        bins = db.query(Bin).filter(Bin.zone_id == zone.id).all()
        if not bins:
            avg_fill = 0
            last_coll = None
        else:
            avg_fill = round(sum(b.fill_level for b in bins) / len(bins), 1)
            dates = [b.last_collected for b in bins if b.last_collected]
            last_coll = max(dates) if dates else None

        result.append(ZoneStats(
            zone_id=zone.id,
            zone_name=zone.name,
            locality=zone.locality,
            total_bins=len(bins),
            avg_fill_level=avg_fill,
            critical_bins=sum(1 for b in bins if b.status == "critical"),
            warning_bins=sum(1 for b in bins if b.status == "warning"),
            normal_bins=sum(1 for b in bins if b.status == "normal"),
            last_collected=last_coll,
        ))

    result.sort(key=lambda x: x.avg_fill_level, reverse=True)
    return result


@router.get("/waste-breakdown")
def waste_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    types = db.query(Bin.waste_type, func.count(Bin.id)).group_by(Bin.waste_type).all()
    return [{"waste_type": t, "count": c} for t, c in types]


@router.get("/collection-history")
def collection_history(
    days: int = Query(7, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = []
    for day_offset in range(days - 1, -1, -1):
        day = datetime.utcnow() - timedelta(days=day_offset)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(Bin).filter(
            Bin.last_collected >= day_start,
            Bin.last_collected < day_end,
        ).count()
        result.append({
            "date": day.strftime("%Y-%m-%d"),
            "collections": count,
        })
    return result


@router.get("/vehicles")
def vehicle_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicles = db.query(Vehicle).all()
    return [
        {
            "id": v.id,
            "vehicle_code": v.vehicle_code,
            "vehicle_type": v.vehicle_type,
            "capacity_tons": v.capacity_tons,
            "is_available": v.is_available,
            "driver_name": v.driver_name,
            "current_lat": v.current_lat,
            "current_lng": v.current_lng,
        }
        for v in vehicles
    ]
