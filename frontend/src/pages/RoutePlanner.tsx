import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getOptimisedRoutes } from '../api/endpoints';
import type { OptimisedRoute } from '../types';
import { Card, LoadingSpinner, EmptyState, FillBar, PageHeader } from '../components/UI';
import { MapPin, RefreshCw, Clock, Ruler } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  offline: '#94a3b8',
};

const ROUTE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

function AutoFit({ routes }: { routes: OptimisedRoute[] }) {
  const map = useMap();
  useEffect(() => {
    const all = routes.flatMap((r) => r.bins.map((b) => [b.latitude, b.longitude] as [number, number]));
    if (all.length > 0) {
      const lats = all.map((p) => p[0]);
      const lngs = all.map((p) => p[1]);
      map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [30, 30] });
    }
  }, [routes]);
  return null;
}

const RoutePlanner: React.FC = () => {
  const [routes, setRoutes] = useState<OptimisedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [minFill, setMinFill] = useState(50);
  const [selectedRoute, setSelectedRoute] = useState<OptimisedRoute | null>(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOptimisedRoutes(minFill);
      setRoutes(res.data);
      if (res.data.length > 0) setSelectedRoute(res.data[0]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [minFill]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return (
    <div>
      <PageHeader
        title="Route Planner"
        subtitle="AI-optimized collection routes using nearest-neighbour algorithm"
        action={
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Min fill:
              <select
                value={minFill}
                onChange={(e) => setMinFill(Number(e.target.value))}
                className="ml-2 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                {[20, 40, 50, 60, 70, 80].map((v) => (
                  <option key={v} value={v}>{v}%</option>
                ))}
              </select>
            </label>
            <button onClick={fetchRoutes} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
              <RefreshCw size={12} />
              Optimise
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Route list */}
        <div className="xl:col-span-1 space-y-2">
          <Card title={`${routes.length} Optimised Routes`}>
            {loading ? (
              <LoadingSpinner text="Optimising..." />
            ) : routes.length === 0 ? (
              <EmptyState message="No bins above min fill level" icon={<MapPin size={36} />} />
            ) : (
              <div className="space-y-2">
                {routes.map((route, i) => (
                  <button
                    key={route.zone_id}
                    onClick={() => setSelectedRoute(route)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRoute?.zone_id === route.zone_id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                      />
                      <span className="text-sm font-semibold text-slate-700">{route.zone_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-slate-500 mt-2">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} />
                        {route.total_bins} bins
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler size={10} />
                        {route.estimated_distance_km} km
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {route.estimated_duration_min} min
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-400">Avg fill</span>
                        <span className="font-semibold text-slate-700">{route.avg_fill_level}%</span>
                      </div>
                      <FillBar value={route.avg_fill_level} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {selectedRoute && (
            <Card title="Bin Sequence">
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {selectedRoute.bins.map((b, i) => (
                  <div key={b.bin_id} className="flex items-center gap-2 p-2 rounded bg-slate-50 text-xs">
                    <span className="text-slate-400 w-5 text-right">{i + 1}.</span>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[b.status] || '#94a3b8' }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-semibold text-blue-600">{b.bin_code}</span>
                      <span className="text-slate-400 ml-1 truncate">{b.address}</span>
                    </div>
                    <span className="font-semibold text-slate-600">{b.fill_level.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Map */}
        <div
          className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          style={{ height: 560 }}
        >
          {loading ? (
            <LoadingSpinner text="Loading map..." />
          ) : (
            <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ width: '100%', height: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <AutoFit routes={routes} />
              {routes.map((route, ri) => {
                const color = ROUTE_COLORS[ri % ROUTE_COLORS.length];
                const positions = route.bins.map((b) => [b.latitude, b.longitude] as [number, number]);
                const isSelected = selectedRoute?.zone_id === route.zone_id;
                return (
                  <React.Fragment key={route.zone_id}>
                    <Polyline
                      positions={positions}
                      pathOptions={{ color, weight: isSelected ? 4 : 2, opacity: isSelected ? 1 : 0.5, dashArray: isSelected ? undefined : '6 4' }}
                    />
                    {route.bins.map((bin, bi) => (
                      <CircleMarker
                        key={bin.bin_id}
                        center={[bin.latitude, bin.longitude]}
                        radius={isSelected ? 8 : 5}
                        pathOptions={{
                          fillColor: STATUS_COLORS[bin.status] || '#94a3b8',
                          color: isSelected ? color : '#fff',
                          weight: isSelected ? 2 : 1,
                          fillOpacity: 0.9,
                        }}
                      >
                        <Popup>
                          <div className="text-xs">
                            <p className="font-bold">Stop {bi + 1}: {bin.bin_code}</p>
                            <p className="text-slate-500">{bin.address}</p>
                            <p>Fill: <strong>{bin.fill_level.toFixed(0)}%</strong></p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
