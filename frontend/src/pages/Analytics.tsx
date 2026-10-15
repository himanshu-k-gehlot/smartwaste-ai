import React, { useEffect, useState, useCallback } from 'react';
import {
  getFillTrend, getZoneStats, getWasteBreakdown,
  getCollectionHistory, getVehicleStats,
} from '../api/endpoints';
import type { FillTrendPoint, ZoneStats } from '../types';
import { Card, LoadingSpinner, EmptyState, PageHeader } from '../components/UI';
import { RefreshCw } from 'lucide-react';
import type { PieLabelRenderProps } from 'recharts';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { format } from 'date-fns';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e'];

const Analytics: React.FC = () => {
  const [trend24, setTrend24] = useState<FillTrendPoint[]>([]);
  const [trend7d, setTrend7d] = useState<FillTrendPoint[]>([]);
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [wasteBreakdown, setWasteBreakdown] = useState<{ waste_type: string; count: number }[]>([]);
  const [history, setHistory] = useState<{ date: string; collections: number }[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [t24, t7, z, w, h, v] = await Promise.all([
        getFillTrend(24),
        getFillTrend(168),
        getZoneStats(),
        getWasteBreakdown(),
        getCollectionHistory(7),
        getVehicleStats(),
      ]);
      setTrend24(t24.data);
      setTrend7d(t7.data);
      setZones(z.data);
      setWasteBreakdown(w.data);
      setHistory(h.data);
      setVehicles(v.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <LoadingSpinner text="Loading analytics..." />;

  const vehicleTypes = vehicles.reduce((acc: Record<string, number>, v) => {
    acc[v.vehicle_type] = (acc[v.vehicle_type] || 0) + 1;
    return acc;
  }, {});
  const vehiclePieData = Object.entries(vehicleTypes).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Historical trends and operational insights"
        action={
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="24h Fill Level Trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="recorded_at" tickFormatter={(v: string) => format(new Date(v), 'HH:mm')} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip labelFormatter={(l: any) => format(new Date(l), 'HH:mm')} formatter={(v: any) => [`${v}%`]} />
              <Area type="monotone" dataKey="avg_fill" name="Avg Fill" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
              <Area type="monotone" dataKey="max_fill" name="Max Fill" stroke="#ef4444" fill="none" strokeDasharray="4 2" strokeWidth={1.5} />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="7-Day Fill Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend7d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="recorded_at" tickFormatter={(v: string) => format(new Date(v), 'MMM d')} tick={{ fontSize: 10 }} interval={Math.floor(trend7d.length / 7)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip labelFormatter={(l: any) => format(new Date(l), 'MMM d HH:mm')} formatter={(v: any) => [`${v}%`]} />
              <Line type="monotone" dataKey="avg_fill" name="Avg Fill" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Zone Performance">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={zones} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="locality" tick={{ fontSize: 10 }} width={80} />
              <Tooltip formatter={(v: any) => [`${v}%`, 'Avg Fill']} />
              <Bar dataKey="avg_fill_level" name="Avg Fill" radius={[0, 4, 4, 0]}>
                {zones.map((z, i) => (
                  <Cell key={i} fill={z.avg_fill_level >= 75 ? '#ef4444' : z.avg_fill_level >= 50 ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Waste Type Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={wasteBreakdown} dataKey="count" nameKey="waste_type" cx="50%" cy="50%" outerRadius={80} label={({ name }: PieLabelRenderProps) => name} labelLine={false}>
                {wasteBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Vehicle Fleet">
          {vehiclePieData.length === 0 ? <EmptyState message="No vehicle data" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={vehiclePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: PieLabelRenderProps) => `${(name ?? '').toString().split(' ')[0]}(${value ?? ''})`} labelLine={false}>
                  {vehiclePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 3 - Collection history */}
      <Card title="7-Day Collection History">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="collections" name="Collections" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Zone table */}
      <Card title="Zone Statistics" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Zone', 'Locality', 'Total Bins', 'Avg Fill', 'Critical', 'Warning', 'Normal'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.zone_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs font-medium text-slate-700 max-w-[140px] truncate">{z.zone_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{z.locality}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{z.total_bins}</td>
                  <td className="px-3 py-2 text-xs font-semibold">
                    <span className={z.avg_fill_level >= 75 ? 'text-red-600' : z.avg_fill_level >= 50 ? 'text-yellow-600' : 'text-green-600'}>
                      {z.avg_fill_level}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-red-600 font-semibold">{z.critical_bins}</td>
                  <td className="px-3 py-2 text-xs text-yellow-600 font-semibold">{z.warning_bins}</td>
                  <td className="px-3 py-2 text-xs text-green-600 font-semibold">{z.normal_bins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
