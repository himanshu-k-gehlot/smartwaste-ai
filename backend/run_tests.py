"""
Starts uvicorn in a background thread then runs all API tests in the same process.
Allows testing without a separate terminal on Windows.
"""
import sys, os, threading, time
# Force UTF-8 output on Windows so arrow/Unicode chars don't crash cp1252
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ── 1. Start uvicorn in a daemon thread ───────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

def _serve():
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="warning")

server_thread = threading.Thread(target=_serve, daemon=True)
server_thread.start()

# Give the server time to start
print("Starting backend server...")
time.sleep(4)

# ── 2. Run the tests ──────────────────────────────────────────────────────────
import urllib.request, json

BASE = 'http://127.0.0.1:8000'

def get(path, token=None):
    req = urllib.request.Request(BASE + path)
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def post(path, body, token=None):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
          headers={'Content-Type': 'application/json'})
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

failures = []

def check(label, cond, detail=''):
    sym = '[PASS]' if cond else '[FAIL]'
    print(f'{sym} {label}  {detail}')
    if not cond:
        failures.append(label)

# ── Tests ─────────────────────────────────────────────────────────────────────

# 1 Health
h = get('/health')
check('Health', h['status'] == 'ok', h['status'])

# 2 Login – admin
res = post('/api/auth/login', {'username': 'admin', 'password': 'admin123'})
token = res['access_token']
check('Login admin', token is not None, 'role=' + res['role'])

# 3 KPI
kpi = get('/api/analytics/kpi', token)
check('KPI total_bins', kpi['total_bins'] > 0,
      f"total={kpi['total_bins']} crit={kpi['bins_critical']} warn={kpi['bins_warning']}")

# 4 Bins list
bins = get('/api/bins', token)
check('Bins list', len(bins) > 0, f'{len(bins)} bins returned')

# 5 Bins filter by status
crit_bins = get('/api/bins?status=critical', token)
check('Bins filter critical', isinstance(crit_bins, list),
      f'{len(crit_bins)} critical bins')

# 6 Active alerts
alerts = get('/api/alerts?is_resolved=false', token)
check('Active alerts', isinstance(alerts, list),
      f'{len(alerts)} active alerts')

# 7 Priority rankings
prio = get('/api/priority?limit=10', token)
check('Priority list', len(prio) > 0,
      f"top={prio[0]['bin_code']} score={prio[0]['priority_score']}")

# 8 Route optimise
routes = get('/api/routes/optimise?min_fill=30', token)
check('Route optimise', len(routes) > 0, f'{len(routes)} zones optimised')

# 9 Zone stats
zones = get('/api/analytics/zone-stats', token)
check('Zone stats', len(zones) == 6, f'{len(zones)} zones')

# 10 Fill trend
trend = get('/api/analytics/fill-trend?hours=24', token)
check('Fill trend', len(trend) > 0, f'{len(trend)} hourly points')

# 11 Collection plans
plans = get('/api/plans', token)
check('Collection plans', isinstance(plans, list), f'{len(plans)} plans')

# 12 Waste breakdown
waste = get('/api/analytics/waste-breakdown', token)
types = [w['waste_type'] for w in waste]
check('Waste breakdown', len(waste) >= 3, str(types))

# 13 Collection history
hist = get('/api/analytics/collection-history?days=7', token)
check('Collection history', len(hist) == 7, f'{len(hist)} days')

# 14 Simulation start
sim_start = post('/api/simulation/control',
    {'action': 'start', 'speed_multiplier': 5, 'fill_rate_pct_per_tick': 5}, token)
check('Sim start', sim_start['status'] == 'running', sim_start['status'])

time.sleep(2)

# 15 Simulation pause
sim_pause = post('/api/simulation/control', {'action': 'pause'}, token)
check('Sim pause', sim_pause['status'] == 'paused', sim_pause['status'])

# 16 Simulation reset
sim_reset = post('/api/simulation/control', {'action': 'reset'}, token)
check('Sim reset', sim_reset['status'] == 'stopped', sim_reset['status'])

# 17 Vehicle stats
vehicles = get('/api/analytics/vehicles', token)
check('Vehicles', len(vehicles) == 8, f'{len(vehicles)} vehicles')

# 18 /api/auth/me
me = get('/api/auth/me', token)
check('Auth me', me['username'] == 'admin', f"username={me['username']}")

# 19 Supervisor login
res2 = post('/api/auth/login', {'username': 'supervisor', 'password': 'sup123'})
tok2 = res2['access_token']
check('Login supervisor', tok2 is not None, 'role=' + res2['role'])

# 20 Role enforcement – supervisor cannot control simulation
import urllib.error
try:
    post('/api/simulation/control', {'action': 'start'}, tok2)
    check('Role enforcement', False, 'supervisor should have been 403')
except urllib.error.HTTPError as e:
    check('Role enforcement', e.code == 403, f'supervisor got HTTP {e.code} as expected')

# 21 Sensor readings endpoint
readings = get('/api/readings?limit=5', token)
check('Sensor readings', isinstance(readings, list), f'{len(readings)} readings')

# 22 Routes list
routes_list = get('/api/routes', token)
check('Routes list', isinstance(routes_list, list), f'{len(routes_list)} routes')

# 23 Zones list
zones_list = get('/api/routes/zones', token)
check('Zones list', len(zones_list) == 6, f'{len(zones_list)} zones')

# 24 Unauthenticated request -> 401
import urllib.error as ue
try:
    get('/api/bins')
    check('Auth required', False, 'expected 401 but got 200')
except ue.HTTPError as e:
    check('Auth required', e.code == 401, f'unauthenticated -> HTTP {e.code}')

# ── Summary ───────────────────────────────────────────────────────────────────
print()
total = 24
passed = total - len(failures)
if failures:
    print(f'RESULT: {passed}/{total} passed  |  FAILED: {failures}')
    sys.exit(1)
else:
    print(f'RESULT: {passed}/{total} passed  |  ALL TESTS PASSED')
    sys.exit(0)
