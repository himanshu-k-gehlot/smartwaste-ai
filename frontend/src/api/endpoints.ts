import api from './client';
import type {
  Bin, Alert, BinPriority, Route, CollectionPlan,
  KPIStats, FillTrendPoint, ZoneStats, SensorReading,
  SimulationState, OptimisedRoute, Vehicle,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  api.post<{ access_token: string; token_type: string; role: string; full_name: string }>(
    '/auth/login', { username, password }
  );

export const getMe = () => api.get('/auth/me');

// ── Bins ──────────────────────────────────────────────────────────────────────
export const getBins = (params?: Record<string, unknown>) =>
  api.get<Bin[]>('/bins', { params });

export const getBin = (id: number) => api.get<Bin>(`/bins/${id}`);

export const updateBin = (id: number, data: Partial<Bin>) =>
  api.patch<Bin>(`/bins/${id}`, data);

// ── Sensor Readings ───────────────────────────────────────────────────────────
export const getReadings = (params?: Record<string, unknown>) =>
  api.get<SensorReading[]>('/readings', { params });

export const createReading = (data: Partial<SensorReading>) =>
  api.post<SensorReading>('/readings', data);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = (params?: Record<string, unknown>) =>
  api.get<Alert[]>('/alerts', { params });

export const resolveAlert = (id: number) =>
  api.patch<Alert>(`/alerts/${id}/resolve`);

export const resolveAllAlerts = () =>
  api.post<{ resolved: number }>('/alerts/resolve-all');

// ── Priority ──────────────────────────────────────────────────────────────────
export const getPriorities = (params?: Record<string, unknown>) =>
  api.get<BinPriority[]>('/priority', { params });

// ── Routes ────────────────────────────────────────────────────────────────────
export const getRoutes = (params?: Record<string, unknown>) =>
  api.get<Route[]>('/routes', { params });

export const getOptimisedRoutes = (minFill = 50) =>
  api.get<OptimisedRoute[]>('/routes/optimise', { params: { min_fill: minFill } });

export const getZones = () =>
  api.get<{ id: number; name: string; locality: string; lat_center: number; lng_center: number; population: number }[]>('/routes/zones');

// ── Collection Plans ──────────────────────────────────────────────────────────
export const getPlans = () => api.get<CollectionPlan[]>('/plans');

export const createPlan = (data: { name: string; scheduled_date: string; notes?: string }) =>
  api.post<CollectionPlan>('/plans', data);

export const updatePlanStatus = (id: number, status: string) =>
  api.patch<CollectionPlan>(`/plans/${id}/status`, null, { params: { status } });

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getKPI = () => api.get<KPIStats>('/analytics/kpi');

export const getFillTrend = (hours = 24, bin_id?: number) =>
  api.get<FillTrendPoint[]>('/analytics/fill-trend', { params: { hours, ...(bin_id ? { bin_id } : {}) } });

export const getZoneStats = () => api.get<ZoneStats[]>('/analytics/zone-stats');

export const getWasteBreakdown = () =>
  api.get<{ waste_type: string; count: number }[]>('/analytics/waste-breakdown');

export const getCollectionHistory = (days = 7) =>
  api.get<{ date: string; collections: number }[]>('/analytics/collection-history', { params: { days } });

export const getVehicleStats = () => api.get<Vehicle[]>('/analytics/vehicles');

// ── Simulation ────────────────────────────────────────────────────────────────
export const getSimulationStatus = () => api.get<SimulationState>('/simulation');

export const controlSimulation = (action: string, speed_multiplier = 1.0, fill_rate_pct_per_tick = 2.0) =>
  api.post('/simulation/control', { action, speed_multiplier, fill_rate_pct_per_tick });
