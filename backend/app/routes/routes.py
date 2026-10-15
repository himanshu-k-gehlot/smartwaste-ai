"""
Route optimization using nearest-neighbour heuristic with priority weighting.
Returns optimised routes per zone focusing on high-fill bins first.
"""
import json
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Bin, Zone, Route, Vehicle
from app.schemas import RouteOut
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/routes", tags=["routes"])


def haversine(lat1, lon1, lat2, lon2) -> float:
    """Distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def nearest_neighbour_route(bins: List[Bin]) -> List[Bin]:
    if not bins:
        return []
    unvisited = list(bins)
    # Start from the bin with highest fill
    unvisited.sort(key=lambda b: b.fill_level, reverse=True)
    route = [unvisited.pop(0)]
    while unvisited:
        last = route[-1]
        nearest = min(unvisited, key=lambda b: haversine(last.latitude, last.longitude, b.latitude, b.longitude))
        route.append(nearest)
        unvisited.remove(nearest)
    return route


def enrich_route(r: Route) -> RouteOut:
    out = RouteOut.model_validate(r)
    if r.zone:
        out.zone_name = r.zone.locality
    return out


@router.get("", response_model=List[RouteOut])
def list_routes(
    zone_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Route)
    if zone_id:
        q = q.filter(Route.zone_id == zone_id)
    return [enrich_route(r) for r in q.all()]


@router.get("/optimise", response_model=List[dict])
def optimise_routes(
    min_fill: float = Query(50.0, description="Only include bins above this fill %"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run nearest-neighbour optimisation on-the-fly for all zones.
    Returns optimised bin sequences with estimated distances.
    """
    zones = db.query(Zone).all()
    result = []

    for zone in zones:
        bins = db.query(Bin).filter(
            Bin.zone_id == zone.id,
            Bin.is_active == True,
            Bin.fill_level >= min_fill,
        ).all()

        if not bins:
            continue

        ordered = nearest_neighbour_route(bins)
        total_dist = 0.0
        for i in range(len(ordered) - 1):
            total_dist += haversine(
                ordered[i].latitude, ordered[i].longitude,
                ordered[i+1].latitude, ordered[i+1].longitude,
            )

        result.append({
            "zone_id": zone.id,
            "zone_name": zone.locality,
            "total_bins": len(ordered),
            "estimated_distance_km": round(total_dist, 2),
            "estimated_duration_min": int(total_dist / 25 * 60 + len(ordered) * 3),
            "avg_fill_level": round(sum(b.fill_level for b in ordered) / len(ordered), 1),
            "bins": [
                {
                    "bin_id": b.id,
                    "bin_code": b.bin_code,
                    "fill_level": b.fill_level,
                    "latitude": b.latitude,
                    "longitude": b.longitude,
                    "address": b.address,
                    "status": b.status,
                }
                for b in ordered
            ],
        })

    result.sort(key=lambda x: x["avg_fill_level"], reverse=True)
    return result


@router.get("/zones", response_model=List[dict])
def list_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zones = db.query(Zone).all()
    return [
        {
            "id": z.id,
            "name": z.name,
            "locality": z.locality,
            "lat_center": z.lat_center,
            "lng_center": z.lng_center,
            "population": z.population,
        }
        for z in zones
    ]
