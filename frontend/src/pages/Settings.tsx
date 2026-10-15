import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader } from '../components/UI';
import { User, Shield, Info } from 'lucide-react';

const ROLE_PERMISSIONS: Record<string, { label: string; permissions: string[] }> = {
  admin: {
    label: 'Admin',
    permissions: [
      'View all dashboards and data',
      'Create & manage collection plans',
      'Manage users and roles',
      'Start / pause / reset simulation',
      'Resolve alerts (all)',
      'Export reports',
      'Update bin status',
    ],
  },
  operations_manager: {
    label: 'Operations Manager',
    permissions: [
      'View all dashboards and data',
      'Create & manage collection plans',
      'Start / pause / reset simulation',
      'Resolve alerts (all)',
      'Export reports',
      'Update bin status',
    ],
  },
  supervisor: {
    label: 'Supervisor',
    permissions: [
      'View dashboards and data',
      'View collection plans (read-only)',
      'Resolve individual alerts',
      'View reports',
    ],
  },
};

const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration and user preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current user */}
        <Card title="Current User">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">{user?.full_name}</p>
              <p className="text-sm text-slate-500">@{user?.username}</p>
              <div className="mt-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  user?.role === 'operations_manager' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Role permissions */}
        <Card title="Role Permissions">
          {user && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {ROLE_PERMISSIONS[user.role]?.label || user.role}
                </span>
              </div>
              <ul className="space-y-1.5">
                {ROLE_PERMISSIONS[user.role]?.permissions.map((perm, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Demo credentials */}
        <Card title="Demo Credentials">
          <div className="space-y-3">
            {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => {
              const creds: Record<string, { u: string; p: string }> = {
                admin: { u: 'admin', p: 'admin123' },
                operations_manager: { u: 'ops_mgr', p: 'ops123' },
                supervisor: { u: 'supervisor', p: 'sup123' },
              };
              const c = creds[role];
              return (
                <div key={role} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{label}</p>
                    <p className="text-xs text-slate-500">
                      Username: <code className="bg-white px-1 rounded border">{c.u}</code>
                      {' '}Password: <code className="bg-white px-1 rounded border">{c.p}</code>
                    </p>
                  </div>
                  {user?.role === role && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
