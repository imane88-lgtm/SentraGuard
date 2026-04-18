// Session
async function checkSession() {
  const r = await fetch('/api/me');
  if (!r.ok) { window.location.href = '/login'; return; }
  const d = await r.json();
  document.getElementById('session-user').textContent = d.username;
}
async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

// Tab switching
const tabTitles = {
  encryption: 'Encryption',
  monitoring: 'Monitoring',
  alerts: 'Alerts',
  users: 'Users',
  settings: 'Settings'
};

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('topbar-title').textContent = tabTitles[name];

  // Set active nav item
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(name)) {
      n.classList.add('active');
    }
  });

  if (name === 'alerts') loadAlertsTable('all');
  if (name === 'users') loadUsers();
  if (name === 'monitoring') refresh();
}
// Color helper
function colorClass(val) {
  if (val >= 85) return 'critical';
  if (val >= 60) return 'warning';
  return 'ok';
}
function setBar(barId, valId, percent) {
  const cls = colorClass(percent);
  document.getElementById(barId).style.width = percent + '%';
  document.getElementById(barId).className = 'bar-fill ' + cls;
  document.getElementById(valId).textContent = percent + '%';
  document.getElementById(valId).className = 'card-value ' + cls;
}

// Monitoring
async function fetchMonitor() {
  const r = await fetch('/api/monitor/snapshot');
  const d = await r.json();
  setBar('cpu-bar','cpu-val', d.cpu.percent);
  setBar('ram-bar','ram-val', d.ram.percent);
  setBar('disk-bar','disk-val', d.disk.percent);
  document.getElementById('net-sent').textContent = d.network.bytes_sent_mb + ' MB';
  document.getElementById('net-recv').textContent = d.network.bytes_recv_mb + ' MB';
  document.getElementById('last-update').textContent =
    new Date().toLocaleTimeString();

  document.getElementById('proc-list').innerHTML = d.top_processes.map(p =>
    `<div class="proc-row">
      <span class="proc-name">${p.name}</span>
      <span class="proc-cpu">${(p.cpu_percent||0).toFixed(1)}%</span>
      <span style="color:#6b5fa0">${(p.memory_percent||0).toFixed(1)}% MEM</span>
    </div>`).join('');
}

async function fetchAlerts() {
  const r = await fetch('/api/alerts?limit=5');
  const alerts = await r.json();
  document.getElementById('alerts-list').innerHTML = alerts.length
    ? alerts.map(a => `<div class="alert-item">
        <span class="badge ${a.level}">${a.level}</span>
        <span>${a.message}</span>
      </div>`).join('')
    : '<div style="color:#6b5fa0;font-size:0.8rem">No alerts</div>';

  const s = await fetch('/api/alerts/stats');
  const stats = await s.json();
  document.getElementById('alert-total').textContent = stats.total;
  document.getElementById('a-info').textContent = stats.info + ' info';
  document.getElementById('a-warn').textContent = stats.warning + ' warn';
  document.getElementById('a-crit').textContent = stats.critical + ' crit';

  // Badge on sidebar
  const badge = document.getElementById('crit-badge');
  if (stats.critical > 0) {
    badge.textContent = stats.critical;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

async function fetchIDS() {
  const r = await fetch('/api/ids/anomaly/scan');
  const d = await r.json();
  const hasAlert = d.alerts && d.alerts.length > 0;
  document.getElementById('ids-anomaly').innerHTML = `
    <div class="ids-status">
      <div class="dot ${hasAlert ? 'alert' : ''}"></div>
      <span>Status: <b style="color:${hasAlert?'#f87171':'#818cf8'}">${d.status.toUpperCase()}</b></span>
    </div>
    <div class="ids-status"><div class="dot"></div>CPU: ${d.cpu}%</div>
    <div class="ids-status"><div class="dot"></div>RAM: ${d.ram}%</div>
    ${hasAlert ? d.alerts.map(a =>
      `<div class="alert-item">
        <span class="badge ${a.level}">${a.level}</span>
        <span>${a.message}</span>
      </div>`).join('') : ''}`;

  const b = await fetch('/api/ids/blocked');
  const blocked = await b.json();
  document.getElementById('ids-blocked').innerHTML = blocked.length
    ? blocked.map(ip =>
        `<div class="ids-status">
          <div class="dot alert"></div>
          <span>${ip.ip} — until ${new Date(ip.until).toLocaleTimeString()}</span>
        </div>`).join('')
    : '<div style="color:#818cf8; font-size:0.8rem">✓ No blocked IPs</div>';
}

async function refresh() {
  await Promise.all([fetchMonitor(), fetchAlerts(), fetchIDS()]);
}

// Alerts tab
async function loadAlertsTable(level) {
  const url = level === 'all' ? '/api/alerts?limit=100' : `/api/alerts?level=${level}&limit=100`;
  const r = await fetch(url);
  const alerts = await r.json();
  document.getElementById('alerts-tbody').innerHTML = alerts.length
    ? alerts.map(a => `<tr>
        <td><span class="badge ${a.level}">${a.level}</span></td>
        <td>${a.message}</td>
        <td style="color:#6b5fa0">${a.source}</td>
        <td style="color:#6b5fa0">${new Date(a.timestamp).toLocaleString()}</td>
        <td><button class="btn-outline" style="padding:3px 10px; font-size:0.68rem;"
          onclick="deleteAlert(${a.id})">Del</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="color:#6b5fa0; padding:16px;">No alerts</td></tr>';
}

async function filterAlerts(level) { loadAlertsTable(level); }

async function createAlert() {
  const level = document.getElementById('alert-level').value;
  const message = document.getElementById('alert-msg').value.trim();
  if (!message) return;
  await fetch('/api/alerts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({level, message, source: 'manual'})
  });
  document.getElementById('alert-msg').value = '';
  loadAlertsTable('all');
}

async function deleteAlert(id) {
  await fetch(`/api/alerts/${id}`, {method: 'DELETE'});
  loadAlertsTable('all');
}

async function clearAlerts() {
  const r = await fetch('/api/alerts?limit=1000');
  const alerts = await r.json();
  await Promise.all(alerts.map(a => fetch(`/api/alerts/${a.id}`, {method:'DELETE'})));
  loadAlertsTable('all');
}

// Users tab
async function loadUsers() {
  const r = await fetch('/api/users');
  if (!r.ok) {
    document.getElementById('users-tbody').innerHTML =
      '<tr><td colspan="5" style="color:#6b5fa0; padding:16px;">No user endpoint yet</td></tr>';
    return;
  }
  const users = await r.json();
  document.getElementById('users-tbody').innerHTML = users.map(u => `<tr>
    <td>${u.id}</td>
    <td style="color:#a78bfa">${u.username}</td>
    <td><span class="badge info">${u.role}</span></td>
    <td style="color:#6b5fa0">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '--'}</td>
    <td style="color:#6b5fa0">${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
  </tr>`).join('');
}

async function addUser() {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;
  const el = document.getElementById('user-result');
  if (!username || !password) { el.textContent = 'Fill both fields'; el.className='result-msg err'; return; }
  const r = await fetch('/api/register', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, password})
  });
  const d = await r.json();
  el.textContent = r.ok ? '✓ ' + d.message : '✗ ' + d.error;
  el.className = 'result-msg ' + (r.ok ? 'ok' : 'err');
  if (r.ok) loadUsers();
}

// Hash file
async function hashFile() {
  const path = document.getElementById('hash-path').value.trim();
  const el = document.getElementById('hash-result');
  if (!path) { el.textContent = 'Enter a file path'; return; }
  const r = await fetch('/api/encryption/hash', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({file_path: path})
  });
  const d = await r.json();
  if (r.ok) {
    el.innerHTML = `
      <div style="margin-bottom:6px; color:#a78bfa">File: ${d.filename}</div>
      <div style="margin-bottom:6px; color:#6b5fa0; font-size:0.72rem;">Size: ${d.size_bytes} bytes</div>
      <div style="word-break:break-all; color:#818cf8; font-family:monospace; font-size:0.78rem;">
        SHA-256: ${d.hash}
      </div>`;
  } else {
    el.innerHTML = `<span style="color:#f87171">✗ ${d.error}</span>`;
  }
}

checkSession();
refresh();
setInterval(refresh, 5000);
