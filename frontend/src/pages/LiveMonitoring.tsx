import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Activity } from 'lucide-react';
import { getBins, getZones } from '../api/endpoints';
import type { Bin } from '../types';
import { Card, LoadingSpinner, FillBar, StatusBadge, PageHeader } from '../components/UI';

const STATUS_COLORS: Record<string, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  offline: '#94a3b8',
  maintenance: '#8b5cf6',
};

function FitBounds({ bins }: { bins: Bin[] }) {
  const map = useMap();
  useEffect(() => {
    if (bins.length > 0) {
      const lats = bins.map((b) => b.latitude);
      const lngs = bins.map((b) => b.longitude);
      map.fitBounds(
        [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        { padding: [30, 30] }
      );
    }
  }, [bins]);
  return null;
}

const LiveMonitoring: React.FC = () => {
  const [bins, setBins] = useState<Bin[]>([]);
  const [_zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [binsRes, zonesRes] = await Promise.all([getBins(), getZones()]);
      setBins(binsRes.data);
      setZones(zonesRes.data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const displayed = filterStatus === 'all' ? bins : bins.filter((b) => b.status === filterStatus);

  const counts = {
    total: bins.length,
    normal: bins.filter((b) => b.status === 'normal').length,
    warning: bins.filter((b) => b.status === 'warning').length,
    critical: bins.filter((b) => b.status === 'critical').length,
    offline: bins.filter((b) => b.status === 'offline').length,
  };

  if (loading) return <LoadingSpinner text="Loading live map data..." />;

  return (
    <div>
      <PageHeader
        title="Live Monitoring"
        subtitle="Real-time bin status map — updated every 15 seconds"
        action={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Status filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all', label: `All (${counts.total})`, color: 'slate' },
          { key: 'normal', label: `Normal (${counts.normal})`, color: 'green' },
          { key: 'warning', label: `Warning (${counts.warning})`, color: 'yellow' },
          { key: 'critical', label: `Critical (${counts.critical})`, color: 'red' },
          { key: 'offline', label: `Offline (${counts.offline})`, color: 'slate' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === key
                ? `bg-${color}-100 border-${color}-400 text-${color}-700 font-semibold`
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
        {lastUpdate && (
          <span className="text-xs text-slate-400 ml-auto self-center">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 520 }}>
          <MapContainer
            center={[28.6139, 77.2090]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds bins={bins} />
            {displayed.map((bin) => (
              <CircleMarker
                key={bin.id}
                center={[bin.latitude, bin.longitude]}
                radius={bin.fill_level >= 70 ? 10 : 7}
                pathOptions={{
                  fillColor: STATUS_COLORS[bin.status] || '#94a3b8',
                  color: '#fff',
                  weight: 1.5,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{ click: () => setSelectedBin(bin) }}
              >
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-bold text-sm mb-1">{bin.bin_code}</p>
                    <p className="text-slate-500">{bin.address}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between"><span>Fill:</span><span className="font-semibold">{bin.fill_level.toFixed(1)}%</span></div>
                      <div className="flex justify-between"><span>Temp:</span><span>{bin.temperature.toFixed(1)}°C</span></div>
                      <div className="flex justify-between"><span>Battery:</span><span>{bin.battery_level.toFixed(1)}%</span></div>
                      <div className="flex justify-between"><span>Type:</span><span className="capitalize">{bin.waste_type}</span></div>
                      <div className="flex justify-between"><span>Status:</span>
                        <span className={`font-semibold capitalize ${
                          bin.status === 'critical' ? 'text-red-600' :
                          bin.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                        }`}>{bin.status}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3">
          {/* Legend */}
          <Card title="Map Legend">
            <div className="space-y-2">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-600 capitalize">{status}</span>
                  <span className="text-xs text-slate-400 ml-auto">{bins.filter((b) => b.status === status).length} bins</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Larger circles = higher fill level. Click any bin for details.
            </div>
          </Card>

          {/* Selected bin detail */}
          {selectedBin ? (
            <Card title={`Bin ${selectedBin.bin_code}`} action={
              <button onClick={() => setSelectedBin(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            }>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500">{selectedBin.address}</p>
                  <p className="text-xs text-slate-400">{selectedBin.zone_name}</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Fill Level</span>
                    <span className="font-semibold">{selectedBin.fill_level.toFixed(1)}%</span>
                  </div>
                  <FillBar value={selectedBin.fill_level} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-400">Temperature</p>
                    <p className="font-semibold">{selectedBin.temperature.toFixed(1)}°C</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-400">Battery</p>
                    <p className="font-semibold">{selectedBin.battery_level.toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-400">Waste Type</p>
                    <p className="font-semibold capitalize">{selectedBin.waste_type}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-400">Status</p>
                    <StatusBadge status={selectedBin.status} />
                  </div>
                </div>
                {selectedBin.last_collected && (
                  <p className="text-xs text-slate-400">
                    Last collected: {new Date(selectedBin.last_collected).toLocaleString()}
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <Card title="Bin Detail">
              <div className="flex flex-col items-center text-slate-400 py-6 text-sm">
                <Activity size={28} className="mb-2 opacity-30" />
                <p>Click a bin on the map to see details</p>
              </div>
            </Card>
          )}

          {/* Critical bins list */}
          <Card title="Critical Bins">
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {bins.filter((b) => b.status === 'critical').length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No critical bins 🎉</p>
              ) : bins
                .filter((b) => b.status === 'critical')
                .slice(0, 10)
                .map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBin(b)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-red-800">{b.bin_code}</p>
                      <p className="text-xs text-red-500 truncate">{b.address}</p>
                    </div>
                    <span className="text-xs font-bold text-red-600">{b.fill_level.toFixed(0)}%</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
