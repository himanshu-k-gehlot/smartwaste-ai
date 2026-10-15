import React, { useEffect, useState, useCallback } from 'react';
import { getPriorities } from '../api/endpoints';
import type { BinPriority } from '../types';
import { Card, LoadingSpinner, EmptyState, FillBar, PageHeader } from '../components/UI';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const LEVEL_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const PriorityAnalysis: React.FC = () => {
  const [priorities, setPriorities] = useState<BinPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await getPriorities({ limit: 100 });
      setPriorities(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = filterLevel === 'all' ? priorities : priorities.filter((p) => p.priority_level === filterLevel);

  const levelCounts = {
    critical: priorities.filter((p) => p.priority_level === 'critical').length,
    high: priorities.filter((p) => p.priority_level === 'high').length,
    medium: priorities.filter((p) => p.priority_level === 'medium').length,
    low: priorities.filter((p) => p.priority_level === 'low').length,
  };

  const chartData = priorities.slice(0, 15).map((p) => ({
    name: p.bin_code,
    score: p.priority_score,
    level: p.priority_level,
  }));

  if (loading) return <LoadingSpinner text="Computing priorities..." />;

  return (
    <div>
      <PageHeader
        title="Priority Analysis"
        subtitle="Weighted priority scores — Fill 50% · Temp 20% · Battery 15% · Age 15%"
        action={
          <button onClick={fetchData} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {Object.entries(levelCounts).map(([level, count]) => (
          <button
            key={level}
            onClick={() => setFilterLevel(filterLevel === level ? 'all' : level)}
            className={`bg-white rounded-xl border p-4 text-left transition-all ${
              filterLevel === level ? 'ring-2 ring-blue-500' : 'border-slate-200'
            }`}
          >
            <p className="text-xs text-slate-500 mb-1 capitalize">{level} Priority</p>
            <p className="text-2xl font-bold" style={{ color: LEVEL_COLORS[level] }}>{count}</p>
            <p className="text-xs text-slate-400 mt-0.5">bins</p>
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card title="Top 15 Bins by Priority Score" className="mb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [typeof v === 'number' ? v.toFixed(1) : `${v}`, 'Priority Score']} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={LEVEL_COLORS[entry.level] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Priority Queue ({filtered.length} bins)</h3>
          <span className="text-xs text-slate-400">Sorted by score descending</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">#</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Bin</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Zone</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Fill Level</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Temp</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Battery</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Priority Score</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-12">
                <EmptyState message="No bins match this priority level" icon={<BarChart3 size={36} />} />
              </td></tr>
            ) : (
              filtered.map((p, i) => (
                <tr key={p.bin_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold text-blue-600">{p.bin_code}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[140px]">{p.address}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{p.zone_name}</td>
                  <td className="px-4 py-3 min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <FillBar value={p.fill_level} className="flex-1" />
                      <span className="text-xs font-semibold w-10 text-right">{p.fill_level.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={p.temperature > 50 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {p.temperature.toFixed(1)}°C
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={p.battery_level < 20 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {p.battery_level.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.priority_score}%`,
                            backgroundColor: LEVEL_COLORS[p.priority_level],
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold w-8 text-right" style={{ color: LEVEL_COLORS[p.priority_level] }}>
                        {p.priority_score.toFixed(0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${LEVEL_COLORS[p.priority_level]}20`,
                        color: LEVEL_COLORS[p.priority_level],
                      }}
                    >
                      {p.priority_level}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriorityAnalysis;
