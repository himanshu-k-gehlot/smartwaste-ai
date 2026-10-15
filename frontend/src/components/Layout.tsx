import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { getAlerts } from '../api/endpoints';
import { RefreshCw, Wifi } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [alertCount, setAlertCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await getAlerts({ is_resolved: false, limit: 200 });
        setAlertCount(res.data.length);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar alertCount={alertCount} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">SmartWaste AI</span>
            <span>·</span>
            <span>Smart Waste Collection & Monitoring System</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              <Wifi size={12} />
              {isOnline ? 'Backend Connected' : 'Backend Offline'}
            </div>
            <div className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
