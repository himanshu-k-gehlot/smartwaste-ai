from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Zone ──────────────────────────────────────────────────────────────────────
class ZoneOut(BaseModel):
    id: int
    name: str
    locality: str
    city: str
    population: int
    area_sqkm: float
    lat_center: float
    lng_center: float

    class Config:
        from_attributes = True


# ── Bin ───────────────────────────────────────────────────────────────────────
class BinOut(BaseModel):
    id: int
    bin_code: str
    zone_id: int
    zone_name: Optional[str] = None
    address: Optional[str]
    latitude: float
    longitude: float
    capacity_liters: float
    waste_type: str
    status: str
    fill_level: float
    temperature: float
    battery_level: float
    is_active: bool
    last_collected: Optional[datetime]
    last_reading_at: Optional[datetime]
    installed_at: Optional[datetime]
    maintenance_due: bool

    class Config:
        from_attributes = True


class BinUpdate(BaseModel):
    status: Optional[str] = None
    fill_level: Optional[float] = None
    temperature: Optional[float] = None
    battery_level: Optional[float] = None
    is_active: Optional[bool] = None
    maintenance_due: Optional[bool] = None


# ── SensorReading ─────────────────────────────────────────────────────────────
class SensorReadingOut(BaseModel):
    id: int
    bin_id: int
    fill_level: float
    temperature: Optional[float]
    battery_level: Optional[float]
    weight_kg: Optional[float]
    humidity: Optional[float]
    is_simulated: bool
    recorded_at: Optional[datetime]

    class Config:
        from_attributes = True


class SensorReadingCreate(BaseModel):
    bin_id: int
    fill_level: float
    temperature: Optional[float] = None
    battery_level: Optional[float] = None
    weight_kg: Optional[float] = None
    humidity: Optional[float] = None
    is_simulated: bool = True


# ── Alert ─────────────────────────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    bin_id: Optional[int]
    bin_code: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    message: str
    is_resolved: bool
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Vehicle ───────────────────────────────────────────────────────────────────
class VehicleOut(BaseModel):
    id: int
    vehicle_code: str
    vehicle_type: str
    capacity_tons: float
    fuel_type: str
    driver_name: Optional[str]
    driver_phone: Optional[str]
    is_available: bool
    current_lat: Optional[float]
    current_lng: Optional[float]

    class Config:
        from_attributes = True


# ── Route ─────────────────────────────────────────────────────────────────────
class RouteOut(BaseModel):
    id: int
    route_code: str
    zone_id: int
    zone_name: Optional[str] = None
    name: str
    total_bins: int
    estimated_distance_km: float
    estimated_duration_min: int
    priority_score: float
    waypoints: Optional[str]
    bin_sequence: Optional[str]

    class Config:
        from_attributes = True


# ── Priority ──────────────────────────────────────────────────────────────────
class BinPriority(BaseModel):
    bin_id: int
    bin_code: str
    zone_name: str
    fill_level: float
    temperature: float
    battery_level: float
    waste_type: str
    priority_score: float
    priority_level: str  # low / medium / high / critical
    address: Optional[str]
    latitude: float
    longitude: float
    last_collected: Optional[datetime]


# ── Collection Plan ───────────────────────────────────────────────────────────
class CollectionPlanOut(BaseModel):
    id: int
    plan_code: str
    name: str
    scheduled_date: datetime
    status: str
    total_routes: int
    total_bins_target: int
    total_bins_collected: int
    notes: Optional[str]
    created_by: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class CollectionPlanCreate(BaseModel):
    name: str
    scheduled_date: datetime
    notes: Optional[str] = None
    created_by: Optional[str] = "system"


# ── Analytics / KPI ───────────────────────────────────────────────────────────
class KPIStats(BaseModel):
    total_bins: int
    active_bins: int
    offline_bins: int
    bins_critical: int
    bins_warning: int
    bins_normal: int
    avg_fill_level: float
    total_collections_today: int
    total_alerts_active: int
    total_alerts_resolved: int
    zones_count: int
    vehicles_available: int
    vehicles_total: int
    collection_efficiency_pct: float
    avg_battery_level: float


class FillTrendPoint(BaseModel):
    recorded_at: str
    avg_fill: float
    max_fill: float
    bin_count: int


class ZoneStats(BaseModel):
    zone_id: int
    zone_name: str
    locality: str
    total_bins: int
    avg_fill_level: float
    critical_bins: int
    warning_bins: int
    normal_bins: int
    last_collected: Optional[datetime]


# ── Simulation ────────────────────────────────────────────────────────────────
class SimulationStateOut(BaseModel):
    id: int
    status: str
    speed_multiplier: float
    fill_rate_pct_per_tick: float
    tick_interval_sec: int
    ticks_completed: int
    started_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SimulationControl(BaseModel):
    action: str  # start | pause | reset
    speed_multiplier: Optional[float] = 1.0
    fill_rate_pct_per_tick: Optional[float] = 2.0
