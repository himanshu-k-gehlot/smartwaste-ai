export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operations_manager' | 'supervisor';
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
}

export interface Bin {
  id: number;
  bin_code: string;
  zone_id: number;
  zone_name?: string;
  address?: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  waste_type: string;
  status: 'normal' | 'warning' | 'critical' | 'offline' | 'maintenance';
  fill_level: number;
  temperature: number;
  battery_level: number;
  is_active: boolean;
  last_collected?: string;
  last_reading_at?: string;
  maintenance_due: boolean;
}

export interface SensorReading {
  id: number;
  bin_id: number;
  fill_level: number;
  temperature?: number;
  battery_level?: number;
  weight_kg?: number;
  humidity?: number;
  is_simulated: boolean;
  recorded_at: string;
}

export interface Alert {
  id: number;
  bin_id?: number;
  bin_code?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at?: string;
}

export interface BinPriority {
  bin_id: number;
  bin_code: string;
  zone_name: string;
  fill_level: number;
  temperature: number;
  battery_level: number;
  waste_type: string;
  priority_score: number;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  address?: string;
  latitude: number;
  longitude: number;
  last_collected?: string;
}

export interface Route {
  id: number;
  route_code: string;
  zone_id: number;
  zone_name?: string;
  name: string;
  total_bins: number;
  estimated_distance_km: number;
  estimated_duration_min: number;
  priority_score: number;
  waypoints?: string;
  bin_sequence?: string;
}

export interface CollectionPlan {
  id: number;
  plan_code: string;
  name: string;
  scheduled_date: string;
  status: string;
  total_routes: number;
  total_bins_target: number;
  total_bins_collected: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface KPIStats {
  total_bins: number;
  active_bins: number;
  offline_bins: number;
  bins_critical: number;
  bins_warning: number;
  bins_normal: number;
  avg_fill_level: number;
  total_collections_today: number;
  total_alerts_active: number;
  total_alerts_resolved: number;
  zones_count: number;
  vehicles_available: number;
  vehicles_total: number;
  collection_efficiency_pct: number;
  avg_battery_level: number;
}

export interface FillTrendPoint {
  recorded_at: string;
  avg_fill: number;
  max_fill: number;
  bin_count: number;
}

export interface ZoneStats {
  zone_id: number;
  zone_name: string;
  locality: string;
  total_bins: number;
  avg_fill_level: number;
  critical_bins: number;
  warning_bins: number;
  normal_bins: number;
  last_collected?: string;
}

export interface Vehicle {
  id: number;
  vehicle_code: string;
  vehicle_type: string;
  capacity_tons: number;
  is_available: boolean;
  driver_name?: string;
  current_lat?: number;
  current_lng?: number;
}

export interface SimulationState {
  id: number;
  status: 'running' | 'paused' | 'stopped';
  speed_multiplier: number;
  fill_rate_pct_per_tick: number;
  tick_interval_sec: number;
  ticks_completed: number;
  started_at?: string;
  updated_at?: string;
}

export interface OptimisedRoute {
  zone_id: number;
  zone_name: string;
  total_bins: number;
  estimated_distance_km: number;
  estimated_duration_min: number;
  avg_fill_level: number;
  bins: {
    bin_id: number;
    bin_code: string;
    fill_level: number;
    latitude: number;
    longitude: number;
    address?: string;
    status: string;
  }[];
}
