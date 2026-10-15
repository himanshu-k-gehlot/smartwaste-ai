import React, { useEffect, useState, useCallback } from 'react';
import {
  Trash2, Bell, MapPin, TrendingUp, Activity, Truck,
  Battery, RefreshCw, CheckCircle,
} from 'lucide-react';
import type { PieLabelRenderProps } from 'recharts';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { getKPI, getFillTrend, getZoneStats, getWasteBreakdown, getAlerts } from '../api/endpoints';
import type { KPIStats, FillTrendPoint, ZoneStats } from '../types';
import { KpiCard, Card, LoadingSpinner, EmptyState, StatusBadge, PageHeader } from '../components/UI';
import { format } from 'date-fns';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Dashboard: React.FC = () => {
  const [kpi, setKpi] = useState<KPIStats | null>(null);
  const [trend, setTrend] = useState<FillTrendPoint[]>([]);
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [wasteBreakdown, setWasteBreakdown] = useState<{ waste_type: string; count: number }[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpiRes, trendRes, zoneRes, wasteRes, alertRes] = await Promise.all([
        getKPI(),
        getFillTrend(24),
        getZoneStats(),
        getWasteBreakdown(),
        getAlerts({ is_resolved: false, limit: 5 }),
      ]);
      setKpi(kpiRes.data);
      setTrend(trendRes.data);
      setZones(zoneRes.data);
      setWasteBreakdown(wasteRes.data);
      setRecentAlerts(alertRes.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return <LoadingSpinner text="Loading dashboard data from backend..." />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time waste collection overview · All data from backend"
        action={
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-slate-400">
                Updated {format(lastUpdated, 'HH:mm:ss')}
              </span>
            )}
            <button
              onClick={fetchAll}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* KPI row */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          <KpiCard
            label="Total Bins"
            value={kpi.total_bins}
            sub={`${kpi.active_bins} active`}
            icon={<Trash2 size={18} />}
            color="blue"
          />
          <KpiCard
            label="Critical Bins"
            value={kpi.bins_critical}
            sub="Need immediate collection"
            icon={<Bell size={18} />}
            color="red"
          />
          <KpiCard
            label="Avg Fill Level"
            value={`${kpi.avg_fill_level}%`}
            sub={`${kpi.bins_warning} bins in warning`}
            icon={<Activity size={18} />}
            color={kpi.avg_fill_level > 70 ? 'red' : kpi.avg_fill_level > 50 ? 'orange' : 'green'}
          />
          <KpiCard
            label="Active Alerts"
            value={kpi.total_alerts_active}
            sub={`${kpi.total_alerts_resolved} resolved`}
            icon={<Bell size={18} />}
            color="orange"
          />
          <KpiCard
            label="Vehicles Available"
            value={`${kpi.vehicles_available}/${kpi.vehicles_total}`}
            sub="Ready for deployment"
            icon={<Truck size={18} />}
            color="purple"
          />
          <KpiCard
            label="Collections Today"
            value={kpi.total_collections_today}
            sub="Since midnight"
            icon={<CheckCircle size={18} />}
            color="green"
          />
          <KpiCard
            label="Zones Monitored"
            value={kpi.zones_count}
            sub="Active localities"
            icon={<MapPin size={18} />}
            color="blue"
          />
          <KpiCard
            label="Collection Efficiency"
            value={`${kpi.collection_efficiency_pct}%`}
            sub="Today vs target"
            icon={<TrendingUp size={18} />}
            color={kpi.collection_efficiency_pct >= 80 ? 'green' : 'orange'}
          />
          <KpiCard
            label="Avg Battery"
            value={`${kpi.avg_battery_level}%`}
            sub="Sensor batteries"
            icon={<Battery size={18} />}
            color={kpi.avg_battery_level < 30 ? 'red' : 'green'}
          />
          <KpiCard
            label="Offline Bins"
            value={kpi.offline_bins}
            sub="Sensors not responding"
            icon={<Activity size={18} />}
            color="slate"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card title="24h Fill Level Trend" className="lg:col-span-2">
          {trend.length === 0 ? (
            <EmptyState message="No trend data available yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="recorded_at"
                  tickFormatter={(v) => format(new Date(v), 'HH:mm')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                    formatter={(v: any) => [`${v}%`]}
                    labelFormatter={(l: any) => format(new Date(l), 'MMM d HH:mm')}
                    />
                <Area
                  type="monotone"
                  dataKey="avg_fill"
                  name="Avg Fill"
                  stroke="#3b82f6"
                  fill="#dbeafe"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="max_fill"
                  name="Max Fill"
                  stroke="#ef4444"
                  fill="none"
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Waste Type Distribution">
          {wasteBreakdown.length === 0 ? (
            <EmptyState message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={wasteBreakdown}
                  dataKey="count"
                  nameKey="waste_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: PieLabelRenderProps) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {wasteBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Zone stats + recent alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Zone Fill Level Comparison">
          {zones.length === 0 ? (
            <EmptyState message="No zone data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={zones} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="locality" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Avg Fill']} />
                <Bar dataKey="avg_fill_level" name="Avg Fill" radius={[0, 4, 4, 0]}>
                  {zones.map((z, i) => (
                    <Cell
                      key={i}
                      fill={z.avg_fill_level >= 75 ? '#ef4444' : z.avg_fill_level >= 50 ? '#f59e0b' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Recent Active Alerts">
          {recentAlerts.length === 0 ? (
            <EmptyState message="No active alerts 🎉" icon={<CheckCircle size={40} />} />
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    a.severity === 'critical' ? 'bg-red-500' :
                    a.severity === 'high' ? 'bg-orange-500' :
                    a.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                    <p className="text-xs text-slate-400 truncate">{a.message}</p>
                  </div>
                  <StatusBadge status={a.severity} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
