import React, { useEffect, useState, useCallback } from 'react';
import { getPlans, createPlan, updatePlanStatus } from '../api/endpoints';
import type { CollectionPlan } from '../types';
import { Card, LoadingSpinner, EmptyState, StatusBadge, PageHeader } from '../components/UI';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CollectionPlans: React.FC = () => {
  const [plans, setPlans] = useState<CollectionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPlans();
      setPlans(res.data);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = async () => {
    if (!newName || !newDate) { toast.error('Name and date are required'); return; }
    setCreating(true);
    try {
      await createPlan({ name: newName, scheduled_date: new Date(newDate).toISOString() });
      toast.success('Collection plan created');
      setShowCreate(false);
      setNewName('');
      setNewDate('');
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updatePlanStatus(id, status);
      toast.success('Status updated');
      fetchPlans();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <LoadingSpinner text="Loading collection plans..." />;

  const summary = {
    planned: plans.filter((p) => p.status === 'planned').length,
    in_progress: plans.filter((p) => p.status === 'in_progress').length,
    completed: plans.filter((p) => p.status === 'completed').length,
  };

  return (
    <div>
      <PageHeader
        title="Collection Plans"
        subtitle="Schedule and track waste collection operations"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              <Plus size={12} />
              New Plan
            </button>
            <button onClick={fetchPlans} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Planned</p>
          <p className="text-2xl font-bold text-blue-600">{summary.planned}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">In Progress</p>
          <p className="text-2xl font-bold text-amber-600">{summary.in_progress}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card title="Create New Collection Plan" className="mb-4">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Plan name e.g. Morning Collection – Karol Bagh"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-slate-500 px-4 py-2 rounded-lg text-sm border hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Plans list */}
      <div className="space-y-3">
        {plans.length === 0 ? (
          <EmptyState message="No collection plans yet. Create one!" icon={<ClipboardList size={40} />} />
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-800">{plan.name}</h3>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{plan.plan_code}</span>
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scheduled: {format(new Date(plan.scheduled_date), 'MMM d, yyyy')}
                    {plan.created_by && ` · Created by: ${plan.created_by}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={plan.status}
                    onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-400">Routes</p>
                  <p className="text-sm font-bold text-slate-700">{plan.total_routes}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-400">Target Bins</p>
                  <p className="text-sm font-bold text-slate-700">{plan.total_bins_target}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-400">Collected</p>
                  <p className="text-sm font-bold text-green-600">{plan.total_bins_collected}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-400">Progress</p>
                  <div className="mt-1">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${plan.total_bins_target ? Math.min(100, plan.total_bins_collected / plan.total_bins_target * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {plan.total_bins_target ? Math.round(plan.total_bins_collected / plan.total_bins_target * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {plan.notes && (
                <p className="text-xs text-slate-400 mt-2 italic">{plan.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionPlans;
