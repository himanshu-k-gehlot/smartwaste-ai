from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class WasteType(str, enum.Enum):
    GENERAL = "general"
    RECYCLABLE = "recyclable"
    ORGANIC = "organic"
    HAZARDOUS = "hazardous"
    MEDICAL = "medical"


class BinStatus(str, enum.Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, enum.Enum):
    BIN_FULL = "bin_full"
    SENSOR_OFFLINE = "sensor_offline"
    MAINTENANCE_DUE = "maintenance_due"
    OVERFLOW = "overflow"
    TEMPERATURE_HIGH = "temperature_high"
    FIRE_HAZARD = "fire_hazard"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATIONS_MANAGER = "operations_manager"
    SUPERVISOR = "supervisor"


class PlanStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SimulationStatus(str, enum.Enum):
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


# ── User ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(100))
    role = Column(String(30), default=UserRole.SUPERVISOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Zone ──────────────────────────────────────────────────────────────────────
class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    locality = Column(String(100), nullable=False)
    city = Column(String(80), default="Demo City")
    population = Column(Integer, default=10000)
    area_sqkm = Column(Float, default=2.5)
    lat_center = Column(Float, nullable=False)
    lng_center = Column(Float, nullable=False)

    bins = relationship("Bin", back_populates="zone")
    routes = relationship("Route", back_populates="zone")


# ── Bin ───────────────────────────────────────────────────────────────────────
class Bin(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_code = Column(String(20), unique=True, index=True, nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    address = Column(String(200))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_liters = Column(Float, default=200.0)
    waste_type = Column(String(20), default=WasteType.GENERAL)
    status = Column(String(20), default=BinStatus.NORMAL)
    fill_level = Column(Float, default=0.0)          # 0-100 %
    temperature = Column(Float, default=25.0)        # °C
    battery_level = Column(Float, default=100.0)     # 0-100 %
    is_active = Column(Boolean, default=True)
    last_collected = Column(DateTime(timezone=True))
    last_reading_at = Column(DateTime(timezone=True))
    installed_at = Column(DateTime(timezone=True), server_default=func.now())
    maintenance_due = Column(Boolean, default=False)

    zone = relationship("Zone", back_populates="bins")
    readings = relationship("SensorReading", back_populates="bin", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="bin", cascade="all, delete-orphan")


# ── SensorReading ─────────────────────────────────────────────────────────────
class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    fill_level = Column(Float, nullable=False)
    temperature = Column(Float)
    battery_level = Column(Float)
    weight_kg = Column(Float)
    humidity = Column(Float)
    is_simulated = Column(Boolean, default=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    bin = relationship("Bin", back_populates="readings")


# ── Alert ─────────────────────────────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    alert_type = Column(String(30), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bin = relationship("Bin", back_populates="alerts")


# ── Vehicle ───────────────────────────────────────────────────────────────────
class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_code = Column(String(20), unique=True, nullable=False)
    vehicle_type = Column(String(50), default="Compactor Truck")
    capacity_tons = Column(Float, default=5.0)
    fuel_type = Column(String(20), default="Diesel")
    driver_name = Column(String(100))
    driver_phone = Column(String(20))
    is_available = Column(Boolean, default=True)
    current_lat = Column(Float)
    current_lng = Column(Float)

    route_assignments = relationship("RouteAssignment", back_populates="vehicle")


# ── Route ─────────────────────────────────────────────────────────────────────
class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String(20), unique=True, nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    name = Column(String(100), nullable=False)
    total_bins = Column(Integer, default=0)
    estimated_distance_km = Column(Float, default=0.0)
    estimated_duration_min = Column(Integer, default=0)
    priority_score = Column(Float, default=0.0)
    waypoints = Column(Text)       # JSON string of [lat,lng] list
    bin_sequence = Column(Text)    # JSON string of bin_id list

    zone = relationship("Zone", back_populates="routes")
    assignments = relationship("RouteAssignment", back_populates="route")


# ── RouteAssignment ───────────────────────────────────────────────────────────
class RouteAssignment(Base):
    __tablename__ = "route_assignments"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("collection_plans.id"), nullable=True)
    scheduled_start = Column(DateTime(timezone=True))
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))
    status = Column(String(20), default="pending")
    bins_collected = Column(Integer, default=0)
    distance_covered_km = Column(Float, default=0.0)

    route = relationship("Route", back_populates="assignments")
    vehicle = relationship("Vehicle", back_populates="route_assignments")
    plan = relationship("CollectionPlan", back_populates="assignments")


# ── CollectionPlan ────────────────────────────────────────────────────────────
class CollectionPlan(Base):
    __tablename__ = "collection_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default=PlanStatus.PLANNED)
    total_routes = Column(Integer, default=0)
    total_bins_target = Column(Integer, default=0)
    total_bins_collected = Column(Integer, default=0)
    notes = Column(Text)
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assignments = relationship("RouteAssignment", back_populates="plan")


# ── SimulationState ───────────────────────────────────────────────────────────
class SimulationState(Base):
    __tablename__ = "simulation_state"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(20), default=SimulationStatus.STOPPED)
    speed_multiplier = Column(Float, default=1.0)   # 1x, 2x, 5x
    fill_rate_pct_per_tick = Column(Float, default=2.0)
    tick_interval_sec = Column(Integer, default=30)
    ticks_completed = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
