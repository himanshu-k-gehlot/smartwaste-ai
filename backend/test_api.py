import urllib.request, json, sys, time

BASE = 'http://localhost:8000'

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
    if cond:
        print(f'[PASS] {label} {detail}')
    else:
        print(f'[FAIL] {label} {detail}')
        failures.append(label)

# 1 Health
h = get('/health')
check('Health', h['status'] == 'ok', h['status'])

# 2 Login
res = post('/api/auth/login', {'username': 'admin', 'password': 'admin123'})
token = res['access_token']
check('Login', token is not None, 'role=' + res['role'])

# 3 KPI
kpi = get('/api/analytics/kpi', token)
check('KPI', kpi['total_bins'] > 0, 'total_bins=' + str(kpi['total_bins']) + ' critical=' + str(kpi['bins_critical']))

# 4 Bins
bins = get('/api/bins', token)
check('Bins list', len(bins) > 0, str(len(bins)) + ' bins')

# 5 Bins filtered by status
crit = get('/api/bins?status=critical', token)
check('Bins filter', isinstance(crit, list), str(len(crit)) + ' critical bins')

# 6 Alerts
alerts = get('/api/alerts?is_resolved=false', token)
check('Alerts', isinstance(alerts, list), str(len(alerts)) + ' active alerts')

# 7 Priority
prio = get('/api/priority?limit=10', token)
check('Priority', len(prio) > 0, 'top=' + prio[0]['bin_code'] + ' score=' + str(prio[0]['priority_score']))

# 8 Routes optimise
routes = get('/api/routes/optimise?min_fill=30', token)
check('Route optimise', len(routes) > 0, str(len(routes)) + ' zones')

# 9 Zone stats
zones = get('/api/analytics/zone-stats', token)
check('Zone stats', len(zones) == 6, str(len(zones)) + ' zones')

# 10 Fill trend
trend = get('/api/analytics/fill-trend?hours=24', token)
check('Fill trend', len(trend) > 0, str(len(trend)) + ' points')

# 11 Plans
plans = get('/api/plans', token)
check('Plans', isinstance(plans, list), str(len(plans)) + ' plans')

# 12 Waste breakdown
waste = get('/api/analytics/waste-breakdown', token)
types = [w['waste_type'] for w in waste]
check('Waste breakdown', len(waste) >= 3, str(types))

# 13 Collection history
hist = get('/api/analytics/collection-history?days=7', token)
check('Collection history', len(hist) == 7, str(len(hist)) + ' days')

# 14 Simulation control
sim_start = post('/api/simulation/control',
    {'action': 'start', 'speed_multiplier': 5, 'fill_rate_pct_per_tick': 5}, token)
check('Sim start', sim_start['status'] == 'running', sim_start['status'])

time.sleep(2)
sim_pause = post('/api/simulation/control', {'action': 'pause'}, token)
check('Sim pause', sim_pause['status'] == 'paused', sim_pause['status'])

sim_reset = post('/api/simulation/control', {'action': 'reset'}, token)
check('Sim reset', sim_reset['status'] == 'stopped', sim_reset['status'])

# 15 Vehicle stats
vehicles = get('/api/analytics/vehicles', token)
check('Vehicles', len(vehicles) == 8, str(len(vehicles)) + ' vehicles')

# Supervisor role test
res2 = post('/api/auth/login', {'username': 'supervisor', 'password': 'sup123'})
tok2 = res2['access_token']
try:
    post('/api/simulation/control', {'action': 'start'}, tok2)
    check('Role enforcement', False, 'supervisor should be 403')
except urllib.error.HTTPError as e:
    check('Role enforcement', e.code == 403, 'supervisor got 403 as expected')

print()
if failures:
    print(f'FAILED: {len(failures)} tests: {failures}')
    sys.exit(1)
else:
    print(f'=== ALL 16 TESTS PASSED ===')
