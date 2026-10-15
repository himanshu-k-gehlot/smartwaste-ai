from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Bin, Zone
from app.schemas import BinOut, BinUpdate
from app.auth import get_current_user, require_role
from app.models import User

router = APIRouter(prefix="/api/bins", tags=["bins"])


def enrich_bin(b: Bin, db: Session) -> BinOut:
    out = BinOut.model_validate(b)
    if b.zone:
        out.zone_name = b.zone.locality
    return out


@router.get("", response_model=List[BinOut])
def list_bins(
    zone_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    waste_type: Optional[str] = Query(None),
    min_fill: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Bin).join(Zone, Bin.zone_id == Zone.id)
    if zone_id:
        q = q.filter(Bin.zone_id == zone_id)
    if status:
        q = q.filter(Bin.status == status)
    if waste_type:
        q = q.filter(Bin.waste_type == waste_type)
    if min_fill is not None:
        q = q.filter(Bin.fill_level >= min_fill)
    bins = q.order_by(Bin.fill_level.desc()).all()
    return [enrich_bin(b, db) for b in bins]


@router.get("/{bin_id}", response_model=BinOut)
def get_bin(bin_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = db.query(Bin).filter(Bin.id == bin_id).first()
    if not b:
        from fastapi import HTTPException
        raise HTTPException(404, "Bin not found")
    return enrich_bin(b, db)


@router.patch("/{bin_id}", response_model=BinOut)
def update_bin(
    bin_id: int,
    body: BinUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "operations_manager")),
):
    b = db.query(Bin).filter(Bin.id == bin_id).first()
    if not b:
        from fastapi import HTTPException
        raise HTTPException(404, "Bin not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(b, field, val)
    db.commit()
    db.refresh(b)
    return enrich_bin(b, db)
