import React, { useEffect, useState, useCallback } from 'react';
import { getSimulationStatus, controlSimulation } from '../api/endpoints';
import { Card, LoadingSpinner, StatusBadge, PageHeader } from '../components/UI';
import { Play, Pause, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface SimState {
  status: string;
  speed_multiplier: number;
  fill_rate_pct_per_tick: number;
  tick_interval_sec: number;
  ticks_completed: number;
  started_at?: string;
  updated_at?: string;
}

const IoTSensors: React.FC = () => {
  const [simState, setSimState] = useState<SimState | null>(null);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [fillRate, setFillRate] = useState(2);
  const [acting, setActing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getSimulationStatus();
      const data = res.data as any;
      setSimState(data);
      if (data.speed_multiplier) setSpeed(data.speed_multiplier);
      if (data.fill_rate_pct_per_tick) setFillRate(data.fill_rate_pct_per_tick);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleControl = async (action: string) => {
    setActing(true);
    try {
      await controlSimulation(action, speed, fillRate);
      toast.success(`Simulation ${action}ed`);
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || `Failed to ${action} simulation`);
    } finally {
      setActing(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading IoT sensor status..." />;

  return (
    <div>
      <PageHeader
        title="IoT Sensors & Simulation"
        subtitle="ESP32 sensor management and simulation control"
        action={
          <button onClick={fetchStatus} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Simulation notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Simulation Mode Active</p>
          <p className="text-xs text-amber-700 mt-0.5">
            This demo runs without physical hardware. The simulation engine generates realistic sensor data for all bins.
            In production, ESP32 sensors would POST to <code className="bg-amber-100 px-1 rounded">/api/readings</code> directly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Simulation control */}
        <Card title="Simulation Control">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-slate-700">Simulation Status</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {simState?.ticks_completed || 0} ticks completed
                </p>
              </div>
              <StatusBadge status={simState?.status || 'stopped'} />
            </div>

            {/* Speed control */}
            <div>
              <label className="text-xs text-slate-600 font-medium">
                Speed Multiplier: <span className="text-blue-600 font-bold">{speed}x</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full mt-1"
                disabled={simState?.status === 'running'}
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0.5x (slow)</span>
                <span>10x (fast)</span>
              </div>
            </div>

            {/* Fill rate */}
            <div>
              <label className="text-xs text-slate-600 font-medium">
                Fill Rate per Tick: <span className="text-blue-600 font-bold">{fillRate}%</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={fillRate}
                onChange={(e) => setFillRate(Number(e.target.value))}
                className="w-full mt-1"
                disabled={simState?.status === 'running'}
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0.5% (slow fill)</span>
                <span>10% (fast fill)</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleControl('start')}
                disabled={acting || simState?.status === 'running'}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm font-medium"
              >
                <Play size={14} />
                Start
              </button>
              <button
                onClick={() => handleControl('pause')}
                disabled={acting || simState?.status !== 'running'}
                className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 text-white px-3 py-2.5 rounded-lg hover:bg-yellow-600 disabled:opacity-40 text-sm font-medium"
              >
                <Pause size={14} />
                Pause
              </button>
              <button
                onClick={() => handleControl('reset')}
                disabled={acting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white px-3 py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-40 text-sm font-medium"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>

            {simState?.status === 'running' && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg p-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Simulation running – sensor data updating every {simState.tick_interval_sec}s
              </div>
            )}
          </div>
        </Card>

        {/* Hardware guide */}
        <Card title="ESP32 Hardware Integration">
          <div className="space-y-4 text-xs text-slate-600">
            <div className="bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-xs leading-relaxed">
              <p className="text-slate-400">// ESP32 Arduino sketch (simplified)</p>
              <p>#include &lt;WiFi.h&gt;</p>
              <p>#include &lt;HTTPClient.h&gt;</p>
              <p>#include &lt;NewPing.h&gt;</p>
              <p className="mt-2">#define TRIGGER_PIN 5</p>
              <p>#define ECHO_PIN 18</p>
              <p>#define BIN_HEIGHT_CM 100</p>
              <p className="mt-2 text-slate-400">// POST to /api/readings</p>
              <p>{'{"bin_id": 1, "fill_level": 72.5,'}</p>
              <p>{' "temperature": 31.2, "battery_level": 85.0,'}</p>
              <p>{' "is_simulated": false}'}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-700">Hardware Components</h4>
              {[
                ['Microcontroller', 'ESP32-WROOM-32'],
                ['Distance Sensor', 'HC-SR04 Ultrasonic'],
                ['Temperature', 'DS18B20 (optional)'],
                ['Connectivity', 'Built-in WiFi / GSM SIM800'],
                ['Power', 'LiPo 2000mAh + Solar'],
                ['Enclosure', 'IP65 waterproof enclosure'],
              ].map(([comp, val]) => (
                <div key={comp} className="flex justify-between text-xs">
                  <span className="text-slate-500">{comp}</span>
                  <span className="font-medium text-slate-700">{val}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 mb-1">API Endpoint (Real Hardware)</h4>
              <div className="bg-blue-50 border border-blue-200 rounded p-2 font-mono text-xs">
                POST http://&lt;server-ip&gt;:8000/api/readings
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 mb-1">Fill Level Calculation</h4>
              <p className="text-slate-500">fill = ((bin_height - distance) / bin_height) × 100</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Simulation state details */}
      {simState && (
        <Card title="Simulation Parameters" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Status', simState.status],
              ['Speed', `${simState.speed_multiplier}x`],
              ['Fill Rate', `${simState.fill_rate_pct_per_tick}%/tick`],
              ['Tick Interval', `${simState.tick_interval_sec}s`],
              ['Ticks Completed', simState.ticks_completed.toString()],
              ['Started At', simState.started_at ? new Date(simState.started_at).toLocaleString() : '—'],
              ['Last Updated', simState.updated_at ? new Date(simState.updated_at).toLocaleString() : '—'],
              ['Data Type', '[SIMULATED] — labeled in API'],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5 capitalize">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default IoTSensors;
