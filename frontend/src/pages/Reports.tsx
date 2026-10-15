import React, { useEffect, useState } from 'react';
import { getKPI, getZoneStats, getWasteBreakdown, getCollectionHistory } from '../api/endpoints';
import { Card, LoadingSpinner, PageHeader } from '../components/UI';
import { Download } from 'lucide-react';
import type { PieLabelRenderProps } from 'recharts';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { format } from 'date-fns';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e'];

const Reports: React.FC = () => {
  const [kpi, setKpi] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [waste, setWaste] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getKPI(), getZoneStats(), getWasteBreakdown(), getCollectionHistory(30)])
      .then(([k, z, w, h]) => {
        setKpi(k.data);
        setZones(z.data);
        setWaste(w.data);
        setHistory(h.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  if (loading) return <LoadingSpinner text="Generating report..." />;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Generated: ${format(new Date(), 'PPP p')}`}
        action={
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            <Download size={12} />
            Print / Export
          </button>
        }
      />

      <div className="space-y-4">
        {/* Executive Summary */}
        <Card title="Executive Summary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpi && [
              { label: 'Total Bins', value: kpi.total_bins },
              { label: 'Active Bins', value: kpi.active_bins },
              { label: 'Critical Bins', value: kpi.bins_critical, highlight: kpi.bins_critical > 0 },
              { label: 'Active Alerts', value: kpi.total_alerts_active, highlight: kpi.total_alerts_active > 0 },
              { label: 'Avg Fill Level', value: `${kpi.avg_fill_level}%` },
              { label: 'Collections Today', value: kpi.total_collections_today },
              { label: 'Vehicles Available', value: `${kpi.vehicles_available}/${kpi.vehicles_total}` },
              { label: 'Avg Battery', value: `${kpi.avg_battery_level}%` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Zone report */}
        <Card title="Zone-wise Report">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {['Zone', 'Bins', 'Avg Fill', 'Critical', 'Warning', 'Normal'].map((h) => (
                    <th key={h} className="text-left text-xs text-slate-500 font-semibold px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.zone_id} className="border-b border-slate-50">
                    <td className="px-3 py-2 text-xs font-medium">{z.locality}</td>
                    <td className="px-3 py-2 text-xs">{z.total_bins}</td>
                    <td className="px-3 py-2 text-xs font-semibold">
                      <span className={z.avg_fill_level >= 75 ? 'text-red-600' : z.avg_fill_level >= 50 ? 'text-yellow-600' : 'text-green-600'}>
                        {z.avg_fill_level}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-red-600">{z.critical_bins}</td>
                    <td className="px-3 py-2 text-xs text-yellow-600">{z.warning_bins}</td>
                    <td className="px-3 py-2 text-xs text-green-600">{z.normal_bins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="30-Day Collection History">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} tick={{ fontSize: 9 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="collections" name="Collections" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Waste Type Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={waste} dataKey="count" nameKey="waste_type" cx="50%" cy="50%" outerRadius={75} label={({ name, value }: PieLabelRenderProps) => `${name}(${value})`} labelLine={false}>
                  {waste.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">Report Notes</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>All data sourced directly from the SmartWaste AI backend database</li>
            <li>Sensor readings marked as <strong>[SIMULATED]</strong> are generated by the simulation engine, not physical hardware</li>
            <li>Collection counts reflect bins whose last_collected timestamp falls within today</li>
            <li>Priority scores computed using: Fill 50% · Temperature 20% · Battery 15% · Age since last collection 15%</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports;
