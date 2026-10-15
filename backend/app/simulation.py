"""
Simulation engine – runs in a background thread.
Periodically updates bin fill levels and generates sensor readings + alerts.
Controlled via /api/simulation endpoints.
"""
import random
import threading
import time
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Bin, SensorReading, Alert, SimulationState,
    BinStatus, AlertSeverity, AlertType,
)

_lock = threading.Lock()
_thread: threading.Thread | None = None
_stop_event = threading.Event()


def _derive_status(fill: float, battery: float, temp: float) -> str:
    if battery < 10:
        return BinStatus.OFFLINE
    if fill >= 90 or temp > 55:
        return BinStatus.CRITICAL
    if fill >= 70 or temp > 45 or battery < 25:
        return BinStatus.WARNING
    return BinStatus.NORMAL


def _tick(db: Session, sim: SimulationState):
    bins = db.query(Bin).filter(Bin.is_active == True).all()
    now = datetime.utcnow()

    for b in bins:
        # Drain battery slowly
        b.battery_level = max(0, b.battery_level - random.uniform(0.05, 0.2))

        # Already collected? small reset chance
        if b.fill_level >= 100:
            b.fill_level = random.uniform(5, 20)
            b.last_collected = now
        else:
            rate = sim.fill_rate_pct_per_tick * sim.speed_multiplier
            b.fill_level = min(100.0, b.fill_level + random.uniform(0, rate * 2))

        # Temperature fluctuation
        b.temperature = max(20, min(70, b.temperature + random.uniform(-1.5, 2.0)))

        old_status = b.status
        b.status = _derive_status(b.fill_level, b.battery_level, b.temperature)
        b.last_reading_at = now

        # Persist reading
        db.add(SensorReading(
            bin_id=b.id,
            fill_level=round(b.fill_level, 1),
            temperature=round(b.temperature, 1),
            battery_level=round(b.battery_level, 1),
            weight_kg=round(b.capacity_liters * b.fill_level / 100 * 0.35, 2),
            humidity=round(random.uniform(40, 80), 1),
            is_simulated=True,
            recorded_at=now,
        ))

        # Generate alert on status change to critical/warning
        if old_status != b.status:
            if b.status == BinStatus.CRITICAL:
                # Check no open alert exists
                existing = db.query(Alert).filter(
                    Alert.bin_id == b.id,
                    Alert.is_resolved == False,
                    Alert.alert_type == AlertType.BIN_FULL,
                ).first()
                if not existing:
                    db.add(Alert(
                        bin_id=b.id,
                        alert_type=AlertType.BIN_FULL if b.fill_level >= 90 else AlertType.FIRE_HAZARD,
                        severity=AlertSeverity.CRITICAL,
                        title=f"[SIM] Bin {b.bin_code} critical",
                        message=f"Fill {b.fill_level:.0f}% Temp {b.temperature:.0f}°C — simulated event.",
                        is_resolved=False,
                        created_at=now,
                    ))
            elif b.status == BinStatus.WARNING and old_status == BinStatus.NORMAL:
                existing = db.query(Alert).filter(
                    Alert.bin_id == b.id,
                    Alert.is_resolved == False,
                ).first()
                if not existing:
                    db.add(Alert(
                        bin_id=b.id,
                        alert_type=AlertType.BIN_FULL,
                        severity=AlertSeverity.HIGH,
                        title=f"[SIM] Bin {b.bin_code} warning",
                        message=f"Fill level at {b.fill_level:.0f}% — simulated event.",
                        is_resolved=False,
                        created_at=now,
                    ))

    sim.ticks_completed += 1
    sim.updated_at = now
    db.commit()


def _run_simulation():
    while not _stop_event.is_set():
        db: Session = SessionLocal()
        try:
            sim = db.query(SimulationState).first()
            if not sim or sim.status != "running":
                db.close()
                break
            _tick(db, sim)
            interval = sim.tick_interval_sec
        except Exception as e:
            print(f"[Simulation] tick error: {e}")
            interval = 30
        finally:
            db.close()
        _stop_event.wait(timeout=interval)


# ── Public API ────────────────────────────────────────────────────────────────

def start_simulation(speed_multiplier: float = 1.0, fill_rate: float = 2.0):
    global _thread, _stop_event
    with _lock:
        db = SessionLocal()
        try:
            sim = db.query(SimulationState).first()
            if not sim:
                return
            sim.status = "running"
            sim.speed_multiplier = speed_multiplier
            sim.fill_rate_pct_per_tick = fill_rate
            sim.started_at = datetime.utcnow()
            db.commit()
        finally:
            db.close()

        if _thread and _thread.is_alive():
            return  # already running
        _stop_event.clear()
        _thread = threading.Thread(target=_run_simulation, daemon=True)
        _thread.start()
        print("[Simulation] Started.")


def pause_simulation():
    with _lock:
        db = SessionLocal()
        try:
            sim = db.query(SimulationState).first()
            if sim:
                sim.status = "paused"
                db.commit()
        finally:
            db.close()
        _stop_event.set()
        print("[Simulation] Paused.")


def reset_simulation():
    with _lock:
        _stop_event.set()
        db = SessionLocal()
        try:
            sim = db.query(SimulationState).first()
            if sim:
                sim.status = "stopped"
                sim.ticks_completed = 0
                sim.started_at = None
                db.commit()
            # Reset bin fill levels to moderate values
            import random as _r
            _r.seed()
            bins = db.query(Bin).all()
            for b in bins:
                b.fill_level = round(_r.uniform(5, 50), 1)
                b.temperature = round(_r.uniform(22, 35), 1)
                b.battery_level = round(_r.uniform(60, 100), 1)
                b.status = "normal"
            db.commit()
        finally:
            db.close()
        print("[Simulation] Reset.")


def get_simulation_status() -> dict:
    db = SessionLocal()
    try:
        sim = db.query(SimulationState).first()
        if not sim:
            return {"status": "stopped"}
        return {
            "id": sim.id,
            "status": sim.status,
            "speed_multiplier": sim.speed_multiplier,
            "fill_rate_pct_per_tick": sim.fill_rate_pct_per_tick,
            "tick_interval_sec": sim.tick_interval_sec,
            "ticks_completed": sim.ticks_completed,
            "started_at": sim.started_at.isoformat() if sim.started_at else None,
            "updated_at": sim.updated_at.isoformat() if sim.updated_at else None,
        }
    finally:
        db.close()
