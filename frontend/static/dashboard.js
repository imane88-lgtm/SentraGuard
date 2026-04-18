// Session check + logout
async function checkSession() {
  const r = await fetch('/api/me');
  if (!r.ok) { window.location.href = '/login'; return; }
  const d = await r.json();
  document.getElementById('session-user').textContent = d.username.toUpperCase();
}

async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

checkSession();

function colorClass(val) {
  if (val >= 85) return 'critical';
  if (val >= 60) return 'warning';
  return 'ok';
}

function setBar(barId, valId, percent) {
  const cls = colorClass(percent);
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  bar.style.width = percent + '%';
  bar.className = 'bar-fill ' + cls;
  val.textContent = percent + '%';
  val.className = 'card-value ' + cls;
}

async function fetchMonitor() {
  const r = await fetch('/api/monitor/snapshot');
  const d = await r.json();
  setBar('cpu-bar', 'cpu-val', d.cpu.percent);
  setBar('ram-bar', 'ram-val', d.ram.percent);
  setBar('disk-bar', 'disk-val', d.disk.percent);
  document.getElementById('net-sent').textContent = d.network.bytes_sent_mb + ' MB';
  document.getElementById('net-recv').textContent = d.network.bytes_recv_mb + ' MB';
  document.getElementById('last-update').textContent =
    new Date().toLocaleTimeString();

  const pl = document.getElementById('proc-list');
  pl.innerHTML = d.top_processes.map(p =>
    `<div class="proc-row">
      <span class="proc-name">${p.name}</span>
      <span class="proc-cpu">${(p.cpu_percent||0).toFixed(1)}% CPU</span>
      <span style="color:#4a6fa5">${(p.memory_percent||0).toFixed(1)}% MEM</span>
    </div>`
  ).join('');
}

async function fetchAlerts() {
  const r = await fetch('/api/alerts?limit=6');
  const alerts = await r.json();
  const el = document.getElementById('alerts-list');
  el.innerHTML = alerts.length ? alerts.map(a =>
    `<div class="alert-item">
      <span class="badge ${a.level}">${a.level}</span>
      <span>${a.message}</span>
    </div>`
  ).join('') : '<div style="color:#4a6fa5;font-size:0.8rem">No alerts</div>';

  const s = await fetch('/api/alerts/stats');
  const stats = await s.json();
  document.getElementById('alert-total').textContent = stats.total;
  document.getElementById('a-info').textContent = stats.info + ' info';
  document.getElementById('a-warn').textContent = stats.warning + ' warn';
  document.getElementById('a-crit').textContent = stats.critical + ' crit';
}

async function fetchIDS() {
  const r = await fetch('/api/ids/anomaly/scan');
  const d = await r.json();
  const el = document.getElementById('ids-anomaly');
  const hasAlert = d.alerts && d.alerts.length > 0;
  el.innerHTML = `
    <div class="ids-status">
      <div class="dot ${hasAlert ? 'alert' : ''}"></div>
      <span>Status: <b style="color:${hasAlert?'#ff4444':'#00ff88'}">${d.status.toUpperCase()}</b></span>
    </div>
    <div class="ids-status"><div class="dot"></div>CPU: ${d.cpu}%</div>
    <div class="ids-status"><div class="dot"></div>RAM: ${d.ram}%</div>
    ${hasAlert ? d.alerts.map(a =>
      `<div class="alert-item">
        <span class="badge ${a.level}">${a.level}</span>
        <span>${a.message}</span>
      </div>`).join('') : ''}
  `;

  const b = await fetch('/api/ids/blocked');
  const blocked = await b.json();
  const bl = document.getElementById('ids-blocked');
  bl.innerHTML = blocked.length ? blocked.map(ip =>
    `<div class="ids-status">
      <div class="dot alert"></div>
      <span>${ip.ip} blocked until ${new Date(ip.until).toLocaleTimeString()}</span>
    </div>`
  ).join('') : '<div style="color:#00ff88;font-size:0.8rem">✓ No blocked IPs</div>';
}

async function refresh() {
  await Promise.all([fetchMonitor(), fetchAlerts(), fetchIDS()]);
}

refresh();
setInterval(refresh, 5000);
