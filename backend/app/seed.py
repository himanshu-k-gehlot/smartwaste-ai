"""
Seed realistic sample data for SmartWaste AI.
Covers 6 zones / localities with 80 bins total.
"""
import random
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.models import (
    User, Zone, Bin, SensorReading, Alert, Vehicle,
    Route, CollectionPlan, RouteAssignment, SimulationState,
    WasteType, BinStatus, AlertSeverity, AlertType, UserRole, PlanStatus,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ZONES = [
    {"name": "North Zone – Karol Bagh",    "locality": "Karol Bagh",    "lat": 28.6527, "lng": 77.1903, "pop": 82000, "area": 3.2},
    {"name": "South Zone – Lajpat Nagar",  "locality": "Lajpat Nagar",  "lat": 28.5677, "lng": 77.2433, "pop": 65000, "area": 2.8},
    {"name": "East Zone – Laxmi Nagar",    "locality": "Laxmi Nagar",   "lat": 28.6279, "lng": 77.2762, "pop": 74000, "area": 3.5},
    {"name": "West Zone – Dwarka",         "locality": "Dwarka",        "lat": 28.5921, "lng": 77.0460, "pop": 91000, "area": 4.1},
    {"name": "Central Zone – Connaught",   "locality": "Connaught Place","lat": 28.6315, "lng": 77.2167, "pop": 40000, "area": 1.9},
    {"name": "South-East – Saket",         "locality": "Saket",         "lat": 28.5245, "lng": 77.2066, "pop": 55000, "area": 2.6},
]

ADDRESSES = {
    "Karol Bagh":     ["Ajmal Khan Rd","Pusa Rd","Bank St","Dev Nagar","Gaffar Market","Ramjas Rd"],
    "Lajpat Nagar":   ["Central Market","Ring Rd","Aurobindo Marg","Amar Colony","South Ex"],
    "Laxmi Nagar":    ["Vikas Marg","Nirman Vihar","Preet Vihar","Pandav Nagar"],
    "Dwarka":         ["Sector 10","Sector 12","Sector 14","Sector 6","Sector 22","Sector 3"],
    "Connaught Place":["Rajiv Chowk","Block A","Block B","Block D","Janpath","Baba Kharak Singh"],
    "Saket":          ["Malviya Nagar","Sheikh Sarai","Press Enclave","Pushp Vihar"],
}

WASTE_TYPES = [WasteType.GENERAL, WasteType.RECYCLABLE, WasteType.ORGANIC,
               WasteType.HAZARDOUS, WasteType.MEDICAL]
WASTE_WEIGHTS = [0.50, 0.25, 0.15, 0.06, 0.04]

VEHICLES = [
    {"code": "VH-101", "type": "Compactor Truck",    "cap": 8.0, "driver": "Rajesh Kumar",   "phone": "9810001001"},
    {"code": "VH-102", "type": "Compactor Truck",    "cap": 8.0, "driver": "Suresh Singh",   "phone": "9810001002"},
    {"code": "VH-103", "type": "Mini Truck",         "cap": 3.0, "driver": "Amit Sharma",    "phone": "9810001003"},
    {"code": "VH-104", "type": "Mini Truck",         "cap": 3.0, "driver": "Priya Verma",    "phone": "9810001004"},
    {"code": "VH-105", "type": "Tipper Truck",       "cap": 10.0,"driver": "Mohan Lal",      "phone": "9810001005"},
    {"code": "VH-106", "type": "Tipper Truck",       "cap": 10.0,"driver": "Anita Gupta",    "phone": "9810001006"},
    {"code": "VH-107", "type": "Electric Compactor", "cap": 5.0, "driver": "Ravi Patel",     "phone": "9810001007"},
    {"code": "VH-108", "type": "Electric Compactor", "cap": 5.0, "driver": "Sunita Yadav",   "phone": "9810001008"},
]


def rand_offset(center: float, spread: float = 0.02) -> float:
    return center + random.uniform(-spread, spread)


def derive_status(fill: float, battery: float, temp: float) -> str:
    if battery < 10:
        return BinStatus.OFFLINE
    if fill >= 90 or temp > 55:
        return BinStatus.CRITICAL
    if fill >= 70 or temp > 45 or battery < 25:
        return BinStatus.WARNING
    return BinStatus.NORMAL


def seed_all(db: Session):
    # Idempotency – skip if already seeded
    if db.query(User).count() > 0:
        return

    random.seed(42)

    # ── Users ─────────────────────────────────────────────────────────────────
    users = [
        User(username="admin",    email="admin@smartwaste.ai",   full_name="Admin User",
             hashed_password=pwd_context.hash("admin123"),     role=UserRole.ADMIN),
        User(username="ops_mgr",  email="ops@smartwaste.ai",     full_name="Operations Manager",
             hashed_password=pwd_context.hash("ops123"),       role=UserRole.OPERATIONS_MANAGER),
        User(username="supervisor",email="sup@smartwaste.ai",   full_name="Field Supervisor",
             hashed_password=pwd_context.hash("sup123"),       role=UserRole.SUPERVISOR),
    ]
    db.add_all(users)
    db.flush()

    # ── Zones ─────────────────────────────────────────────────────────────────
    zone_objs = []
    for z in ZONES:
        zone_objs.append(Zone(
            name=z["name"], locality=z["locality"], city="New Delhi",
            population=z["pop"], area_sqkm=z["area"],
            lat_center=z["lat"], lng_center=z["lng"],
        ))
    db.add_all(zone_objs)
    db.flush()

    # ── Vehicles ──────────────────────────────────────────────────────────────
    vehicle_objs = []
    for v in VEHICLES:
        zo = random.choice(zone_objs)
        vehicle_objs.append(Vehicle(
            vehicle_code=v["code"], vehicle_type=v["type"],
            capacity_tons=v["cap"], fuel_type="Diesel" if "Electric" not in v["type"] else "Electric",
            driver_name=v["driver"], driver_phone=v["phone"],
            is_available=random.random() > 0.2,
            current_lat=rand_offset(zo.lat_center),
            current_lng=rand_offset(zo.lng_center),
        ))
    db.add_all(vehicle_objs)
    db.flush()

    # ── Bins (80 bins across 6 zones) ─────────────────────────────────────────
    bin_counter = 1
    all_bins = []
    now = datetime.utcnow()

    for zone in zone_objs:
        locality = zone.locality
        addresses = ADDRESSES.get(locality, ["Main Road", "Cross Road", "Market"])
        n_bins = random.randint(12, 16)

        for _ in range(n_bins):
            fill = round(random.uniform(5, 98), 1)
            temp = round(random.uniform(22, 62), 1)
            batt = round(random.uniform(8, 100), 1)
            w_type = random.choices(WASTE_TYPES, WASTE_WEIGHTS)[0]
            status = derive_status(fill, batt, temp)
            last_coll = now - timedelta(hours=random.randint(2, 72))

            b = Bin(
                bin_code=f"BIN-{bin_counter:04d}",
                zone_id=zone.id,
                address=f"{random.choice(addresses)}, {locality}",
                latitude=rand_offset(zone.lat_center, 0.025),
                longitude=rand_offset(zone.lng_center, 0.025),
                capacity_liters=random.choice([100, 150, 200, 300]),
                waste_type=w_type,
                status=status,
                fill_level=fill,
                temperature=temp,
                battery_level=batt,
                is_active=random.random() > 0.05,
                last_collected=last_coll,
                last_reading_at=now - timedelta(minutes=random.randint(1, 60)),
                maintenance_due=random.random() < 0.1,
            )
            db.add(b)
            db.flush()
            all_bins.append(b)
            bin_counter += 1

            # Historical readings (last 24 h, every 30 min)
            for h in range(48, 0, -1):
                hist_fill = max(0, fill - (h * random.uniform(0.5, 2)))
                db.add(SensorReading(
                    bin_id=b.id,
                    fill_level=round(min(100, hist_fill), 1),
                    temperature=round(temp + random.uniform(-3, 3), 1),
                    battery_level=round(min(100, batt + random.uniform(0, 2)), 1),
                    weight_kg=round(b.capacity_liters * hist_fill / 100 * 0.35, 2),
                    humidity=round(random.uniform(40, 80), 1),
                    is_simulated=True,
                    recorded_at=now - timedelta(minutes=30 * h),
                ))

    db.flush()

    # ── Alerts ────────────────────────────────────────────────────────────────
    for b in all_bins:
        if b.fill_level >= 90:
            db.add(Alert(
                bin_id=b.id, alert_type=AlertType.BIN_FULL,
                severity=AlertSeverity.CRITICAL,
                title=f"Bin {b.bin_code} critically full",
                message=f"Fill level at {b.fill_level:.0f}% — immediate collection required.",
                is_resolved=False,
            ))
        elif b.fill_level >= 70:
            db.add(Alert(
                bin_id=b.id, alert_type=AlertType.BIN_FULL,
                severity=AlertSeverity.HIGH,
                title=f"Bin {b.bin_code} approaching full",
                message=f"Fill level at {b.fill_level:.0f}%. Schedule collection soon.",
                is_resolved=False,
            ))
        if b.temperature > 55:
            db.add(Alert(
                bin_id=b.id, alert_type=AlertType.FIRE_HAZARD,
                severity=AlertSeverity.CRITICAL,
                title=f"High temperature in {b.bin_code}",
                message=f"Temperature {b.temperature:.0f}°C — possible fire hazard.",
                is_resolved=False,
            ))
        if b.battery_level < 15:
            db.add(Alert(
                bin_id=b.id, alert_type=AlertType.SENSOR_OFFLINE,
                severity=AlertSeverity.MEDIUM,
                title=f"Low battery: {b.bin_code}",
                message=f"Battery at {b.battery_level:.0f}%. Replace soon.",
                is_resolved=False,
            ))

    # Some resolved historical alerts
    for b in random.sample(all_bins, min(20, len(all_bins))):
        db.add(Alert(
            bin_id=b.id, alert_type=AlertType.BIN_FULL,
            severity=AlertSeverity.HIGH,
            title=f"Bin {b.bin_code} resolved",
            message="Bin collected and reset.",
            is_resolved=True,
            resolved_by="ops_mgr",
            resolved_at=now - timedelta(hours=random.randint(1, 12)),
            created_at=now - timedelta(hours=random.randint(13, 24)),
        ))

    db.flush()

    # ── Routes ────────────────────────────────────────────────────────────────
    route_objs = []
    route_counter = 1
    for zone in zone_objs:
        zone_bins = [b for b in all_bins if b.zone_id == zone.id]
        # 2 routes per zone
        for r_idx in range(1, 3):
            chunk = zone_bins[((r_idx - 1) * len(zone_bins) // 2):(r_idx * len(zone_bins) // 2)]
            if not chunk:
                continue
            priority = round(sum(b.fill_level for b in chunk) / max(len(chunk), 1), 1)
            waypoints = [[b.latitude, b.longitude] for b in chunk]
            ro = Route(
                route_code=f"RT-{route_counter:03d}",
                zone_id=zone.id,
                name=f"{zone.locality} Route {r_idx}",
                total_bins=len(chunk),
                estimated_distance_km=round(random.uniform(4, 15), 2),
                estimated_duration_min=random.randint(45, 180),
                priority_score=priority,
                waypoints=json.dumps(waypoints),
                bin_sequence=json.dumps([b.id for b in chunk]),
            )
            db.add(ro)
            db.flush()
            route_objs.append(ro)
            route_counter += 1

    # ── Collection Plans ──────────────────────────────────────────────────────
    for day_offset in range(0, 5):
        plan_date = now + timedelta(days=day_offset)
        status = PlanStatus.COMPLETED if day_offset < 0 else (
            PlanStatus.IN_PROGRESS if day_offset == 0 else PlanStatus.PLANNED
        )
        plan = CollectionPlan(
            plan_code=f"CP-{2024100 + day_offset}",
            name=f"Daily Collection Plan – {plan_date.strftime('%b %d, %Y')}",
            scheduled_date=plan_date,
            status=status,
            total_routes=len(route_objs),
            total_bins_target=len(all_bins),
            total_bins_collected=int(len(all_bins) * random.uniform(0.7, 0.95)) if day_offset == 0 else 0,
            notes="Auto-generated by SmartWaste AI priority engine",
            created_by="admin",
        )
        db.add(plan)
        db.flush()

        for ro in route_objs:
            v = random.choice(vehicle_objs)
            db.add(RouteAssignment(
                route_id=ro.id, vehicle_id=v.id, plan_id=plan.id,
                scheduled_start=plan_date.replace(hour=6, minute=0),
                status="pending",
            ))

    # ── Simulation state ──────────────────────────────────────────────────────
    db.add(SimulationState(
        status="stopped",
        speed_multiplier=1.0,
        fill_rate_pct_per_tick=2.0,
        tick_interval_sec=30,
        ticks_completed=0,
    ))

    db.commit()
    print("[OK] Seed data inserted successfully.")
