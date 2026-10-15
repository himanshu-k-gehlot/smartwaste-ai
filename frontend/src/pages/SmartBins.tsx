import React, { useEffect, useState, useCallback } from 'react';
import { getBins, updateBin } from '../api/endpoints';
import type { Bin } from '../types';
import { LoadingSpinner, EmptyState, FillBar, StatusBadge, PageHeader } from '../components/UI';
import { Trash2, Search, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const WASTE_TYPES = ['all', 'general', 'recyclable', 'organic', 'hazardous', 'medical'];
const STATUSES = ['all', 'normal', 'warning', 'critical', 'offline', 'maintenance'];

const SmartBins: React.FC = () => {
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wasteFilter, setWasteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const fetchBins = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (wasteFilter !== 'all') params.waste_type = wasteFilter;
      const res = await getBins(params);
      setBins(res.data);
    } catch (e) {
      toast.error('Failed to load bins');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, wasteFilter]);

  useEffect(() => {
    fetchBins();
  }, [fetchBins]);

  const filtered = bins.filter((b) =>
    search === '' ||
    b.bin_code.toLowerCase().includes(search.toLowerCase()) ||
    (b.address || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.zone_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const markCollected = async (bin: Bin) => {
    try {
      await updateBin(bin.id, { fill_level: 5, status: 'normal' });
      toast.success(`${bin.bin_code} marked as collected`);
      fetchBins();
    } catch {
      toast.error('Failed to update bin');
    }
  };

  if (loading) return <LoadingSpinner text="Loading bins..." />;

  return (
    <div>
      <PageHeader
        title="Smart Bins"
        subtitle={`Monitoring ${bins.length} bins across all zones`}
        action={
          <button onClick={fetchBins} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, address, zone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>
            ))}
          </select>
          <select
            value={wasteFilter}
            onChange={(e) => { setWasteFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            {WASTE_TYPES.map((w) => (
              <option key={w} value={w}>{w === 'all' ? 'All Types' : w}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Bin Code</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Zone</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Address</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Waste Type</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Fill Level</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Temp</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Battery</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  <EmptyState message="No bins match your filters" icon={<Trash2 size={36} />} />
                </td>
              </tr>
            ) : (
              paged.map((bin) => (
                <tr key={bin.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{bin.bin_code}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{bin.zone_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{bin.address}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {bin.waste_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <FillBar value={bin.fill_level} className="flex-1" />
                      <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                        {bin.fill_level.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={bin.temperature > 50 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {bin.temperature.toFixed(1)}°C
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={bin.battery_level < 20 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {bin.battery_level.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={bin.status} />
                    {bin.maintenance_due && (
                      <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Maint</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => markCollected(bin)}
                      disabled={bin.fill_level < 10}
                      className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Mark Collected
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartBins;
