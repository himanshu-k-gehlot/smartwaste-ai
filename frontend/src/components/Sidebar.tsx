import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Trash2, Bell, BarChart3,
  MapPin, ClipboardList, TrendingUp, Cpu, FileText,
  Settings, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/live',          icon: Activity,        label: 'Live Monitoring' },
  { to: '/bins',          icon: Trash2,          label: 'Smart Bins' },
  { to: '/alerts',        icon: Bell,            label: 'Alerts',       badge: true },
  { to: '/priority',      icon: BarChart3,       label: 'Priority Analysis' },
  { to: '/routes',        icon: MapPin,          label: 'Route Planner' },
  { to: '/plans',         icon: ClipboardList,   label: 'Collection Plans' },
  { to: '/analytics',     icon: TrendingUp,      label: 'Analytics' },
  { to: '/iot',           icon: Cpu,             label: 'IoT Sensors' },
  { to: '/reports',       icon: FileText,        label: 'Reports' },
  { to: '/settings',      icon: Settings,        label: 'Settings' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  operations_manager: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-green-100 text-green-700',
};

interface SidebarProps {
  alertCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ alertCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              SW
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">SmartWaste AI</div>
              <div className="text-xs text-slate-400">v1.0.0</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && (
              <span className="flex-1 truncate">{label}</span>
            )}
            {!collapsed && badge && alertCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 p-4">
        {!collapsed && user && (
          <div className="mb-3">
            <div className="text-sm font-medium text-white truncate">{user.full_name}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] || 'bg-slate-700 text-slate-300'}`}>
              {user.role.replace('_', ' ')}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-sm w-full"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
