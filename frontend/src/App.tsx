import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import SmartBins from './pages/SmartBins';
import Alerts from './pages/Alerts';
import PriorityAnalysis from './pages/PriorityAnalysis';
import RoutePlanner from './pages/RoutePlanner';
import CollectionPlans from './pages/CollectionPlans';
import Analytics from './pages/Analytics';
import IoTSensors from './pages/IoTSensors';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveMonitoring />} />
            <Route path="/bins" element={<SmartBins />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/priority" element={<PriorityAnalysis />} />
            <Route path="/routes" element={<RoutePlanner />} />
            <Route path="/plans" element={<CollectionPlans />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/iot" element={<IoTSensors />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
