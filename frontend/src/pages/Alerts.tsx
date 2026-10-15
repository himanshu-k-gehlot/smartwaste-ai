import React, { useEffect, useState, useCallback } from 'react';
import { getAlerts, resolveAlert, resolveAllAlerts } from '../api/endpoints';
import type { Alert } from '../types';
import { LoadingSpinner, EmptyState, StatusBadge, PageHeader } from '../components/UI';
import { Bell, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 200 };
      if (!showResolved) params.is_resolved = false;
      const res = await getAlerts(params);
      setAlerts(res.data);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleResolve = async (id: number) => {
    try {
      await resolveAlert(id);
      toast.success('Alert resolved');
      fetchAlerts();
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  const handleResolveAll = async () => {
    if (!confirm('Resolve all active alerts?')) return;
    try {
      const res = await resolveAllAlerts();
      toast.success(`${res.data.resolved} alerts resolved`);
      fetchAlerts();
    } catch {
      toast.error('Failed');
    }
  };

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);
  const activeCount = alerts.filter((a) => !a.is_resolved).length;

  if (loading) return <LoadingSpinner text="Loading alerts..." />;

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle={`${activeCount} active alerts`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleResolveAll}
              className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              <CheckCircle size={12} />
              Resolve All
            </button>
            <button
              onClick={fetchAlerts}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Critical', sev: 'critical', color: 'red' },
          { label: 'High', sev: 'high', color: 'orange' },
          { label: 'Medium', sev: 'medium', color: 'yellow' },
          { label: 'Low', sev: 'low', color: 'blue' },
        ].map(({ label, sev, color }) => {
          const count = alerts.filter((a) => a.severity === sev && !a.is_resolved).length;
          return (
            <button
              key={sev}
              onClick={() => setFilter(filter === sev ? 'all' : sev)}
              className={`bg-white rounded-xl border p-4 text-left transition-all ${
                filter === sev ? 'border-blue-400 shadow-md' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold text-${color}-600`}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* Toggle resolved */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="w-4 h-4"
          />
          Show resolved alerts
        </label>
        <span className="text-xs text-slate-400">{filtered.length} shown</span>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            message={showResolved ? 'No alerts found' : 'No active alerts — all clear! 🎉'}
            icon={<Bell size={40} />}
          />
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-opacity ${
                alert.is_resolved ? 'opacity-60' : ''
              } ${
                alert.severity === 'critical' ? 'border-red-200' :
                alert.severity === 'high' ? 'border-orange-200' :
                alert.severity === 'medium' ? 'border-yellow-200' : 'border-slate-200'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                alert.severity === 'critical' ? 'bg-red-500' :
                alert.severity === 'high' ? 'bg-orange-500' :
                alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{alert.title}</span>
                  {alert.bin_code && (
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {alert.bin_code}
                    </span>
                  )}
                  <StatusBadge status={alert.severity} />
                  {alert.is_resolved && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} /> Resolved
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>{alert.alert_type.replace('_', ' ')}</span>
                  {alert.created_at && <span>{format(new Date(alert.created_at), 'MMM d, HH:mm')}</span>}
                  {alert.resolved_by && <span>Resolved by: {alert.resolved_by}</span>}
                </div>
              </div>
              {!alert.is_resolved && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-100 shrink-0"
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
