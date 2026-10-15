from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Alert, Bin
from app.schemas import AlertOut
from app.auth import get_current_user, require_role
from app.models import User

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def enrich_alert(a: Alert) -> AlertOut:
    out = AlertOut.model_validate(a)
    if a.bin:
        out.bin_code = a.bin.bin_code
    return out


@router.get("", response_model=List[AlertOut])
def list_alerts(
    is_resolved: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Alert)
    if is_resolved is not None:
        q = q.filter(Alert.is_resolved == is_resolved)
    if severity:
        q = q.filter(Alert.severity == severity)
    alerts = q.order_by(Alert.created_at.desc()).limit(limit).all()
    return [enrich_alert(a) for a in alerts]


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        from fastapi import HTTPException
        raise HTTPException(404, "Alert not found")
    a.is_resolved = True
    a.resolved_by = current_user.username
    a.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(a)
    return enrich_alert(a)


@router.post("/resolve-all", response_model=dict)
def resolve_all_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "operations_manager")),
):
    from datetime import datetime
    alerts = db.query(Alert).filter(Alert.is_resolved == False).all()
    now = datetime.utcnow()
    for a in alerts:
        a.is_resolved = True
        a.resolved_by = current_user.username
        a.resolved_at = now
    db.commit()
    return {"resolved": len(alerts)}
