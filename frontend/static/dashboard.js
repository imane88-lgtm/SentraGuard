// /static/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  refresh();
  loadLogStats();

  setInterval(refresh, 5000);
  setInterval(refreshSimLog, 2000);
  setInterval(() => {
    const lt = document.getElementById('tab-logs');
    if (lt && lt.classList.contains('active')) loadLogs('all');
  }, 8000);

  const timelockInput = document.getElementById('enc-unlock');
  if (timelockInput) {
    timelockInput.addEventListener('change', function () {
      const preview = document.getElementById('timelock-preview');
      if (!preview) return;

      if (this.value) {
        const dt = new Date(this.value);
        const now = new Date();
        const diff = dt - now;

        if (diff > 0) {
          const totalMinutes = Math.floor(diff / 60000);
          const days = Math.floor(totalMinutes / 1440);
          const hours = Math.floor((totalMinutes % 1440) / 60);
          const minutes = totalMinutes % 60;

          let text = '🔒 Will lock for ';
          if (days > 0) text += `${days}d `;
          text += `${hours}h ${minutes}m`;
          preview.textContent = text;
          preview.style.color = '#f59e0b';
        } else {
          preview.textContent = '⚠ Date is in the past — timelock will not apply';
          preview.style.color = '#f87171';
        }
      } else {
        preview.textContent = '';
      }
    });
  }
});

// ── SAFETY HELPERS ───────────────────────────────────
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchJson(url, options = {}) {
  const r = await fetch(url, options);
  let data = null;

  try {
    data = await r.json();
  } catch {
    data = { error: 'Invalid server response' };
  }

  return { ok: r.ok, status: r.status, data };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ── SESSION ──────────────────────────────────────────
async function checkSession() {
  try {
    const { ok, data } = await fetchJson('/api/me');
    if (!ok) {
      window.location.href = '/login';
      return;
    }
    setText('session-user', data.username || '--');
  } catch {
    window.location.href = '/login';
  }
}

async function doLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
}

// ── CHARTS ───────────────────────────────────────────
let cpuChart, ramChart;
const maxPts = 20;
const cpuData = Array(maxPts).fill(0);
const ramData = Array(maxPts).fill(0);
const chartLabels = Array(maxPts).fill('');

const chartOpts = {
  responsive: true,
  animation: { duration: 300 },
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false },
    y: {
      min: 0,
      max: 100,
      ticks: { color: '#4c3d6e', font: { size: 10 } },
      grid: { color: 'rgba(124,58,237,0.08)' }
    }
  }
};

function initCharts() {
  if (cpuChart || ramChart) return;

  const c1 = document.getElementById('cpu-chart');
  const c2 = document.getElementById('ram-chart');
  if (!c1 || !c2 || typeof Chart === 'undefined') return;

  cpuChart = new Chart(c1.getContext('2d'), {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        data: cpuData,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: chartOpts
  });

  ramChart = new Chart(c2.getContext('2d'), {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        data: ramData,
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129,140,248,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: chartOpts
  });
}

function updateCharts(cpu, ram) {
  if (!cpuChart || !ramChart) return;

  const t = new Date().toLocaleTimeString();
  cpuData.push(Number(cpu) || 0);
  cpuData.shift();
  ramData.push(Number(ram) || 0);
  ramData.shift();
  chartLabels.push(t);
  chartLabels.shift();

  cpuChart.update('none');
  ramChart.update('none');
}

// ── HELPERS ──────────────────────────────────────────
function colorClass(v) {
  if (v >= 85) return 'critical';
  if (v >= 60) return 'warning';
  return 'ok';
}

function setBar(barId, valueId, pct) {
  const cls = colorClass(pct);
  const b = document.getElementById(barId);
  const v = document.getElementById(valueId);

  if (b) {
    b.style.width = `${pct}%`;
    b.className = `bar-fill ${cls}`;
  }
  if (v) {
    v.textContent = `${pct}%`;
    v.className = `card-value ${cls}`;
  }
}

// ── MONITORING ───────────────────────────────────────
async function fetchMonitor() {
  try {
    const { ok, data, status } = await fetchJson('/api/monitor/snapshot');
    if (!ok) throw new Error(`HTTP ${status}`);

    setBar('cpu-bar', 'cpu-val', data?.cpu?.percent ?? 0);
    setBar('ram-bar', 'ram-val', data?.ram?.percent ?? 0);
    setBar('disk-bar', 'disk-val', data?.disk?.percent ?? 0);

    const ns = document.getElementById('net-sent');
    const nr = document.getElementById('net-recv');
    const lu = document.getElementById('last-update');
    if (ns) ns.textContent = `${data?.network?.bytes_sent_mb ?? '--'} MB`;
    if (nr) nr.textContent = `${data?.network?.bytes_recv_mb ?? '--'} MB`;
    if (lu) lu.textContent = new Date().toLocaleTimeString();

    updateCharts(data?.cpu?.percent ?? 0, data?.ram?.percent ?? 0);

    const pl = document.getElementById('proc-list');
    if (pl) {
      const procs = Array.isArray(data?.top_processes) ? data.top_processes : [];
      pl.innerHTML = procs.length
        ? procs.map(p => `
            <div class="proc-row">
              <span class="proc-name">${esc(p.name)}</span>
              <span style="color:#818cf8;font-weight:500;">${Number(p.cpu_percent || 0).toFixed(1)}%</span>
              <span style="color:#4c3d6e;font-size:0.72rem;">${Number(p.memory_percent || 0).toFixed(1)}% MEM</span>
            </div>
          `).join('')
        : '<div style="color:#4c3d6e;font-size:0.78rem;padding:8px;">No processes found</div>';
    }
  } catch (e) {
    console.error('fetchMonitor:', e);
  }
}

async function fetchAlerts() {
  try {
    const { ok, data: alertsData } = await fetchJson('/api/alerts?limit=5');
    const alerts = Array.isArray(alertsData) ? alertsData : [];

    const el = document.getElementById('alerts-list');
    if (el) {
      el.innerHTML = alerts.length
        ? alerts.map(a => `
            <div class="alert-item">
              <span class="badge ${esc(a.level)}">${esc(a.level)}</span>
              <span style="flex:1;">${esc(a.message)}</span>
              <span style="color:#4c3d6e;font-size:0.68rem;">${a.timestamp ? esc(new Date(a.timestamp).toLocaleTimeString()) : '--'}</span>
            </div>
          `).join('')
        : '<div style="color:#4c3d6e;font-size:0.78rem;padding:8px;">No alerts</div>';
    }

    const { data: stats } = await fetchJson('/api/alerts/stats');
    const at = document.getElementById('alert-total');
    const ai = document.getElementById('a-info');
    const aw = document.getElementById('a-warn');
    const ac = document.getElementById('a-crit');

    if (at) at.textContent = stats?.total ?? 0;
    if (ai) ai.textContent = `${stats?.info ?? 0} info`;
    if (aw) aw.textContent = `${stats?.warning ?? 0} warn`;
    if (ac) ac.textContent = `${stats?.critical ?? 0} crit`;

    const badge = document.getElementById('crit-badge');
    if (badge) {
      if ((stats?.critical ?? 0) > 0) {
        badge.textContent = stats.critical;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('fetchAlerts:', e);
  }
}

async function fetchIDS() {
  try {
    const { data: d } = await fetchJson('/api/ids/anomaly/scan');
    const hasAlert = Array.isArray(d?.alerts) && d.alerts.length > 0;

    const ia = document.getElementById('ids-anomaly');
    if (ia) {
      ia.innerHTML = `
        <div class="ids-status">
          <div class="dot ${hasAlert ? 'alert' : ''}"></div>
          <span>Status: <b style="color:${hasAlert ? '#f87171' : '#818cf8'}">${esc((d?.status || 'unknown').toUpperCase())}</b></span>
        </div>
        <div class="ids-status"><div class="dot"></div>CPU: <b style="margin-left:4px;">${esc(d?.cpu ?? '--')}%</b></div>
        <div class="ids-status"><div class="dot"></div>RAM: <b style="margin-left:4px;">${esc(d?.ram ?? '--')}%</b></div>
        ${hasAlert ? d.alerts.map(a => `
          <div class="alert-item">
            <span class="badge ${esc(a.level)}">${esc(a.level)}</span>
            <span>${esc(a.message)}</span>
          </div>
        `).join('') : ''}
      `;
    }

    const { data: blocked } = await fetchJson('/api/ids/blocked');
    const ib = document.getElementById('ids-blocked');
    const blockedArr = Array.isArray(blocked) ? blocked : [];

    if (ib) {
      ib.innerHTML = blockedArr.length
        ? blockedArr.map(ip => `
            <div class="ids-status">
              <div class="dot alert"></div>
              <span>${esc(ip.ip)} — until <b>${ip.until ? esc(new Date(ip.until).toLocaleTimeString()) : '--'}</b></span>
            </div>
          `).join('')
        : '<div style="color:#818cf8;font-size:0.78rem;padding:4px;">✓ No blocked IPs</div>';
    }
  } catch (e) {
    console.error('fetchIDS:', e);
  }
}

// ── SIMULATION ───────────────────────────────────────
async function runSimulation(type) {
  const labels = {
    brute_force: 'Brute Force',
    cpu_stress: 'CPU Spike',
    suspicious: 'Suspicious Activity'
  };

  try {
    const { ok } = await fetchJson('/api/ids/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });

    if (ok) {
      appendSimLog(`▶ ${labels[type] || type} simulation started...`, '#a78bfa');
      let polls = 0;
      const iv = setInterval(async () => {
        await refreshSimLog();
        if (++polls >= 20) clearInterval(iv);
      }, 800);
    }
  } catch (e) {
    console.error('runSimulation:', e);
  }
}

async function refreshSimLog() {
  try {
    const { data: logs } = await fetchJson('/api/ids/simulation-log');
    const arr = Array.isArray(logs) ? logs : [];
    const el = document.getElementById('sim-log');
    if (!el || !arr.length) return;

    const colors = { brute_force: '#f87171', anomaly: '#f59e0b', suspicious: '#a78bfa' };

    el.innerHTML = arr.map(l => `
      <div style="display:flex;gap:10px;padding:5px 8px;border-bottom:1px solid rgba(124,58,237,0.06);font-size:0.74rem;align-items:center;">
        <span style="color:#4c3d6e;font-family:monospace;min-width:58px;">${esc(l.time)}</span>
        <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${colors[l.type] || '#818cf8'};"></span>
        <span style="color:#c4b5fd;">${esc(l.message)}</span>
      </div>
    `).join('');

    el.scrollTop = el.scrollHeight;
  } catch (e) {
    console.error('refreshSimLog:', e);
  }
}

function appendSimLog(msg, color) {
  const el = document.getElementById('sim-log');
  if (!el) return;

  if (el.querySelector('div[style*="text-align:center"]')) el.innerHTML = '';
  el.innerHTML += `<div style="padding:5px 8px;font-size:0.74rem;color:${color};">${esc(new Date().toLocaleTimeString())} — ${esc(msg)}</div>`;
}

async function clearSimLog() {
  try {
    await fetch('/api/ids/simulation-log', { method: 'DELETE' });
    const el = document.getElementById('sim-log');
    if (el) {
      el.innerHTML = '<div style="color:#4c3d6e;text-align:center;padding:14px;">No simulations run yet</div>';
    }
  } catch (e) {
    console.error('clearSimLog:', e);
  }
}

// ── ALERTS TAB ───────────────────────────────────────
async function loadAlertsTable(level) {
  try {
    const url = level === 'all'
      ? '/api/alerts?limit=100'
      : `/api/alerts?level=${encodeURIComponent(level)}&limit=100`;

    const { data: alertsData } = await fetchJson(url);
    const alerts = Array.isArray(alertsData) ? alertsData : [];

    const el = document.getElementById('alerts-tbody');
    if (!el) return;

    el.innerHTML = alerts.length
      ? alerts.map(a => `
        <tr>
          <td><span class="badge ${esc(a.level)}">${esc(a.level)}</span></td>
          <td>${esc(a.message)}</td>
          <td style="color:#4c3d6e;">${esc(a.source)}</td>
          <td style="color:#4c3d6e;font-size:0.74rem;">${a.timestamp ? esc(new Date(a.timestamp).toLocaleString()) : '--'}</td>
          <td><button class="btn-outline" style="padding:2px 9px;font-size:0.66rem;" onclick="deleteAlert(${Number(a.id)})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="color:#4c3d6e;padding:18px;text-align:center;">No alerts</td></tr>';
  } catch (e) {
    console.error('loadAlertsTable:', e);
  }
}

async function createAlert() {
  try {
    const level = document.getElementById('alert-level').value;
    const messageEl = document.getElementById('alert-msg');
    const message = (messageEl?.value || '').trim();
    if (!message) return;

    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, source: 'manual' })
    });

    if (messageEl) messageEl.value = '';
    loadAlertsTable('all');
    fetchAlerts();
  } catch (e) {
    console.error('createAlert:', e);
  }
}

async function deleteAlert(id) {
  try {
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    loadAlertsTable('all');
    fetchAlerts();
  } catch (e) {
    console.error('deleteAlert:', e);
  }
}

async function clearAlerts() {
  try {
    const { data: alertsData } = await fetchJson('/api/alerts?limit=1000');
    const alerts = Array.isArray(alertsData) ? alertsData : [];
    await Promise.all(alerts.map(a => fetch(`/api/alerts/${a.id}`, { method: 'DELETE' })));
    loadAlertsTable('all');
    fetchAlerts();
  } catch (e) {
    console.error('clearAlerts:', e);
  }
}

// ── USERS ────────────────────────────────────────────
async function loadUsers() {
  try {
    const { ok, data: usersData, status } = await fetchJson('/api/users');
    const el = document.getElementById('users-tbody');
    if (!el) return;

    if (!ok) {
      el.innerHTML = '<tr><td colspan="5" style="color:#4c3d6e;padding:18px;">Could not load users</td></tr>';
      return;
    }

    const users = Array.isArray(usersData) ? usersData : [];
    el.innerHTML = users.length
      ? users.map(u => `
        <tr>
          <td>${esc(u.id)}</td>
          <td style="color:#a78bfa;font-weight:500;">${esc(u.username)}</td>
          <td><span class="badge info">${esc(u.role)}</span></td>
          <td style="color:#4c3d6e;">${u.created_at ? esc(new Date(u.created_at).toLocaleDateString()) : '--'}</td>
          <td style="color:#4c3d6e;">${u.last_login ? esc(new Date(u.last_login).toLocaleString()) : 'Never'}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="color:#4c3d6e;padding:18px;text-align:center;">No users</td></tr>';
  } catch (e) {
    console.error('loadUsers:', e);
  }
}

async function addUser() {
  try {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const el = document.getElementById('user-result');

    if (!username || !password) {
      if (el) {
        el.textContent = 'Fill both fields';
        el.className = 'result-msg err';
      }
      return;
    }

    const { ok, data } = await fetchJson('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (el) {
      el.textContent = ok ? `✓ ${data?.message || 'User added'}` : `✗ ${data?.error || 'Failed'}`;
      el.className = `result-msg ${ok ? 'ok' : 'err'}`;
    }

    if (ok) loadUsers();
  } catch (e) {
    console.error('addUser:', e);
  }
}

// ── VAULT ────────────────────────────────────────────
let currentRetrieveId = null;

async function loadVault() {
  try {
    const [lr, sr] = await Promise.all([
      fetchJson('/api/vault'),
      fetchJson('/api/vault/stats')
    ]);

    const items = Array.isArray(lr.data) ? lr.data : [];
    const stats = sr.data || {};

    setText('vault-total', stats.total_files ?? 0);
    setText('vault-size', `${stats.total_size_mb ?? 0} MB`);
    setText('vault-pw', stats.pw_protected ?? 0);

    const el = document.getElementById('vault-list');
    if (!el) return;

    if (!items.length) {
      el.innerHTML = `<div style="text-align:center;color:#4c3d6e;padding:36px;font-size:0.83rem;"><i class="fa-solid fa-vault" style="font-size:1.8rem;margin-bottom:10px;display:block;opacity:0.3;"></i>Vault is empty</div>`;
      return;
    }

    el.innerHTML = items.map(item => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(124,58,237,0.07);">
        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(129,140,248,0.1));display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid fa-file-shield" style="color:#a78bfa;"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="color:#c4b5fd;font-weight:600;font-size:0.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.filename)}</div>
          <div style="color:#4c3d6e;font-size:0.7rem;margin-top:2px;">
            ${esc(item.added_at || '--')} &nbsp;•&nbsp; ${(Number(item.size || 0) / 1024).toFixed(1)} KB
            ${item.password_protected ? '&nbsp;•&nbsp;<span style="color:#f59e0b;"><i class="fa-solid fa-key"></i> Protected</span>' : ''}
            ${!item.exists ? '&nbsp;•&nbsp;<span style="color:#f87171;">Missing</span>' : ''}
          </div>
          <div style="color:#4c3d6e;font-size:0.66rem;margin-top:2px;font-family:monospace;opacity:0.6;">${item.hash ? esc(String(item.hash).substring(0, 32) + '...') : ''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="btn-outline" style="padding:5px 10px;font-size:0.72rem;" onclick="openRetrieveModal('${esc(item.id)}')"><i class="fa-solid fa-download"></i> Retrieve</button>
          <button class="btn-outline" style="padding:5px 10px;font-size:0.72rem;border-color:rgba(248,113,113,0.3);color:#f87171;" onclick="deleteFromVault('${esc(item.id)}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Vault load error:', e);
  }
}

async function addToVault() {
  try {
    const fp = document.getElementById('vault-file-path').value.trim();
    const pw = document.getElementById('vault-password').value || null;
    const del = document.getElementById('vault-delete-original').checked;
    const el = document.getElementById('vault-add-result');

    if (!fp) {
      if (el) {
        el.className = 'result-msg err';
        el.textContent = '✗ Select a file first';
      }
      return;
    }

    if (el) {
      el.className = 'result-msg';
      el.textContent = 'Adding to vault...';
    }

    const { ok, data } = await fetchJson('/api/vault/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: fp, password: pw, delete_original: del })
    });

    if (ok) {
      if (el) {
        el.className = 'result-msg ok';
        el.innerHTML = `✓ <b>${esc(data?.item?.filename || 'File')}</b> added to vault`;
      }
      document.getElementById('vault-file-path').value = '';
      document.getElementById('vault-password').value = '';
      document.getElementById('vault-delete-original').checked = false;
      loadVault();
    } else {
      if (el) {
        el.className = 'result-msg err';
        el.textContent = `✗ ${data?.error || 'Failed to add file'}`;
      }
    }
  } catch (e) {
    console.error('addToVault:', e);
  }
}

function openRetrieveModal(id) {
  currentRetrieveId = id;
  document.getElementById('retrieve-password').value = '';
  document.getElementById('retrieve-result').textContent = '';
  document.getElementById('vault-retrieve-modal').classList.add('open');
}

function closeRetrieveModal() {
  document.getElementById('vault-retrieve-modal').classList.remove('open');
  currentRetrieveId = null;
}

async function browseRetrieveDir() {
  try {
    const { ok, data } = await fetchJson('/api/pick-file');
    if (ok && data?.path) {
      const dir = data.path.substring(0, data.path.lastIndexOf('/'));
      document.getElementById('retrieve-output-dir').value = dir || '/tmp';
    }
  } catch (e) {
    console.error('browseRetrieveDir:', e);
  }
}

async function confirmRetrieve() {
  try {
    const outDir = document.getElementById('retrieve-output-dir').value.trim() || '/tmp';
    const pw = document.getElementById('retrieve-password').value || null;
    const el = document.getElementById('retrieve-result');

    if (el) {
      el.className = 'result-msg';
      el.textContent = 'Retrieving...';
    }

    const { ok, data } = await fetchJson('/api/vault/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vault_id: currentRetrieveId, output_dir: outDir, password: pw })
    });

    if (ok) {
      if (el) {
        el.className = 'result-msg ok';
        el.innerHTML = `✓ Retrieved to: <b>${esc(data?.path || '')}</b>`;
      }
      setTimeout(closeRetrieveModal, 2000);
      loadVault();
    } else {
      if (el) {
        el.className = 'result-msg err';
        el.textContent = `✗ ${data?.error || 'Retrieve failed'}`;
      }
    }
  } catch (e) {
    console.error('confirmRetrieve:', e);
  }
}

async function deleteFromVault(id) {
  try {
    const { ok } = await fetchJson(`/api/vault/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (ok) loadVault();
  } catch (e) {
    console.error('deleteFromVault:', e);
  }
}

// ── INTEGRITY ────────────────────────────────────────
const integrityHistory = [];

async function generateSingleHash() {
  try {
    const path = document.getElementById('hash-single-path').value.trim();
    const el = document.getElementById('hash-single-result');
    if (!path) {
      if (el) el.textContent = 'Enter or browse a file path';
      return;
    }

    if (el) {
      el.textContent = 'Computing...';
      el.style.color = '#6b5fa0';
    }

    const { ok, data } = await fetchJson('/api/encryption/integrity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original_path: path })
    });

    if (ok) {
      if (el) {
        el.style.color = '#a78bfa';
        el.innerHTML = `
          <div style="margin-bottom:5px;">
            <span style="color:#6b5fa0;font-size:0.68rem;">FILE</span>
            <span style="color:#c4b5fd;font-weight:600;margin-left:8px;">${esc(data?.filename || '')}</span>
          </div>
          <div style="font-family:monospace;font-size:0.75rem;color:#818cf8;word-break:break-all;background:rgba(124,58,237,0.06);padding:7px 10px;border-radius:6px;border-left:3px solid #7c3aed;">
            ${esc(data?.current_hash || '')}
          </div>
        `;
      }
    } else {
      if (el) {
        el.style.color = '#f87171';
        el.textContent = `✗ ${data?.error || 'Hash failed'}`;
      }
    }
  } catch (e) {
    console.error('generateSingleHash:', e);
  }
}

async function checkIntegrity() {
  try {
    const orig = document.getElementById('integrity-original').value.trim();
    const enc = document.getElementById('integrity-enc').value.trim();
    const el = document.getElementById('integrity-result');

    if (!orig || !enc) {
      if (el) {
        el.style.display = 'block';
        el.style.background = 'rgba(248,113,113,0.08)';
        el.style.borderColor = 'rgba(248,113,113,0.3)';
        el.innerHTML = '<span style="color:#f87171;">Please provide both file paths</span>';
      }
      return;
    }

    if (el) {
      el.style.display = 'block';
      el.style.background = 'rgba(124,58,237,0.06)';
      el.style.borderColor = 'rgba(124,58,237,0.2)';
      el.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:#a78bfa;"></i> <span style="color:#a78bfa;">Verifying...</span>';
    }

    const { ok, data } = await fetchJson('/api/encryption/integrity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original_path: orig, enc_path: enc })
    });

    if (ok) {
      const safe = data?.status === 'safe';

      if (el) {
        el.style.background = safe ? 'rgba(129,140,248,0.08)' : 'rgba(248,113,113,0.08)';
        el.style.borderColor = safe ? 'rgba(129,140,248,0.3)' : 'rgba(248,113,113,0.3)';
        el.innerHTML = `
          <div style="font-size:1.8rem;margin-bottom:8px;">${safe ? '✔' : '❌'}</div>
          <div style="font-size:0.95rem;font-weight:700;color:${safe ? '#818cf8' : '#f87171'};margin-bottom:7px;">
            ${safe ? 'File is SAFE — Not Modified' : 'File has been MODIFIED'}
          </div>
          <div style="font-size:0.7rem;color:#6b5fa0;line-height:1.8;">
            <span style="color:#4c3d6e;">Stored:</span>
            <span style="font-family:monospace;color:#a78bfa;">${esc(String(data?.stored_hash || '').substring(0, 32))}...</span><br>
            <span style="color:#4c3d6e;">Current:</span>
            <span style="font-family:monospace;color:${safe ? '#818cf8' : '#f87171'};">${esc(String(data?.current_hash || '').substring(0, 32))}...</span>
          </div>
        `;
      }

      integrityHistory.unshift({
        file: data?.filename || 'unknown',
        status: data?.status || 'unknown',
        time: new Date().toLocaleTimeString()
      });
      renderIntegrityHistory();

      if (!safe) {
        await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'critical',
            message: `Integrity check FAILED: ${data?.filename || 'file'} has been modified`,
            source: 'integrity'
          })
        });
        fetchAlerts();
      }
    } else {
      if (el) {
        el.style.background = 'rgba(248,113,113,0.08)';
        el.style.borderColor = 'rgba(248,113,113,0.3)';
        el.innerHTML = `<span style="color:#f87171;">✗ ${esc(data?.error || 'Integrity check failed')}</span>`;
      }
    }
  } catch (e) {
    console.error('checkIntegrity:', e);
  }
}

function renderIntegrityHistory() {
  const el = document.getElementById('integrity-history');
  if (!el) return;

  if (!integrityHistory.length) {
    el.textContent = 'No verifications yet';
    return;
  }

  el.innerHTML = integrityHistory.slice(0, 10).map(h => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(124,58,237,0.06);font-size:0.76rem;">
      <span style="font-size:0.9rem;">${h.status === 'safe' ? '✔' : '❌'}</span>
      <span style="color:#c4b5fd;flex:1;">${esc(h.file)}</span>
      <span style="color:${h.status === 'safe' ? '#818cf8' : '#f87171'};font-weight:600;font-size:0.7rem;">${esc(String(h.status).toUpperCase())}</span>
      <span style="color:#4c3d6e;font-size:0.68rem;">${esc(h.time)}</span>
    </div>
  `).join('');
}

// ── LOGS ─────────────────────────────────────────────
const catColors = {
  auth: '#818cf8',
  encryption: '#a78bfa',
  decryption: '#c4b5fd',
  integrity: '#7c3aed',
  ids: '#f87171',
  alert: '#f59e0b',
  system: '#6b5fa0'
};

const catIcons = {
  auth: 'fa-lock',
  encryption: 'fa-key',
  decryption: 'fa-unlock',
  integrity: 'fa-fingerprint',
  ids: 'fa-shield-virus',
  alert: 'fa-bell',
  system: 'fa-gear'
};

async function loadLogs(category) {
  try {
    const url = category === 'all'
      ? '/api/logs?limit=200'
      : `/api/logs?category=${encodeURIComponent(category)}&limit=200`;

    const { data: logsData } = await fetchJson(url);
    const logs = Array.isArray(logsData) ? logsData : [];
    const el = document.getElementById('logs-tbody');
    if (!el) return;

    el.innerHTML = logs.length
      ? logs.map(l => `
        <tr>
          <td style="font-family:monospace;font-size:0.72rem;color:#4c3d6e;white-space:nowrap;">${esc(l.timestamp)}</td>
          <td><span style="display:inline-flex;align-items:center;gap:5px;color:${catColors[l.category] || '#818cf8'};font-size:0.72rem;font-weight:600;"><i class="fa-solid ${catIcons[l.category] || 'fa-circle'}"></i>${esc(l.category)}</span></td>
          <td style="color:#c4b5fd;font-size:0.78rem;font-weight:500;">${esc(l.action)}</td>
          <td style="color:#6b5fa0;font-size:0.75rem;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(l.detail || '')}">${esc(l.detail || '—')}</td>
          <td><span style="padding:2px 7px;border-radius:6px;font-size:0.62rem;font-weight:600;background:${l.status === 'success' ? 'rgba(129,140,248,0.1)' : 'rgba(248,113,113,0.1)'};color:${l.status === 'success' ? '#818cf8' : '#f87171'};border:1px solid ${l.status === 'success' ? 'rgba(129,140,248,0.2)' : 'rgba(248,113,113,0.2)'};">${esc(l.status)}</span></td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="color:#4c3d6e;padding:18px;text-align:center;">No logs</td></tr>';

    await loadLogStats();
  } catch (e) {
    console.error('loadLogs:', e);
  }
}

async function loadLogStats() {
  try {
    const { data: s } = await fetchJson('/api/logs/stats');
    setText('log-total', s?.total ?? 0);
    setText('log-success', s?.success ?? 0);
    setText('log-errors', s?.error ?? 0);

    const { data: logsData } = await fetchJson('/api/logs?limit=1');
    const logs = Array.isArray(logsData) ? logsData : [];
    setText('log-last', logs.length ? logs[0].timestamp : '--');
  } catch (e) {
    console.error('loadLogStats:', e);
  }
}

async function clearActivityLogs() {
  try {
    await fetch('/api/logs', { method: 'DELETE' });
    loadLogs('all');
  } catch (e) {
    console.error('clearActivityLogs:', e);
  }
}

// ── SECURE COMM ──────────────────────────────────────
let commPeerIP   = '192.168.216.135';
let commSenderName = 'Kali';
let commConnected  = false;

function getPeerIP(){return document.getElementById('comm-peer-ip').value.trim()||commPeerIP;}
function getSenderName(){return document.getElementById('comm-sender-name').value.trim()||commSenderName;}

async function generateCommKeys(){
  const el=document.getElementById('comm-connect-result');
  el.className='result-msg';el.textContent='Generating RSA-2048 keypair...';
  const r=await fetch('/api/comm/genkeys',{method:'POST'});
  const d=await r.json();
  if(r.ok){el.className='result-msg ok';el.textContent='✓ RSA keypair generated — ready to communicate';}
  else{el.className='result-msg err';el.textContent='✗ '+d.error;}
}

async function connectToPeer(){
  const ip=getPeerIP();
  const el=document.getElementById('comm-connect-result');
  el.className='result-msg';el.textContent='Connecting to '+ip+'...';
  const r=await fetch('/api/comm/connect',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({peer_ip:ip})
  });
  const d=await r.json();
  const ps=document.getElementById('comm-peer-status');
  if(r.ok){
    commConnected=true;
    el.className='result-msg ok';
    el.innerHTML=`✓ Connected to <b>${ip}</b> — Machine: ${d.peer.machine}`;
    if(ps)ps.innerHTML=`<span style="color:#818cf8;"><i class="fa-solid fa-circle" style="font-size:0.5rem;margin-right:6px;"></i>${ip} online</span>`;
  }else{
    commConnected=false;
    el.className='result-msg err';
    el.textContent='✗ '+(d.error||'Cannot connect');
    if(ps)ps.innerHTML=`<span style="color:#f87171;"><i class="fa-solid fa-circle" style="font-size:0.5rem;margin-right:6px;"></i>Offline</span>`;
  }
}

async function sendMessage(){
  const message  = document.getElementById('comm-message-input').value.trim();
  const ip       = getPeerIP();
  const name     = getSenderName();
  const el       = document.getElementById('comm-msg-result');
  const usePwd   = document.getElementById('use-msg-password').checked;
  const password = usePwd ? document.getElementById('comm-msg-password').value : null;

  if(!message){el.className='result-msg err';el.textContent='✗ Type a message first';return;}
  el.className='result-msg';el.textContent='Encrypting and sending...';

  const r=await fetch('/api/comm/send-message',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message,receiver_ip:ip,sender_name:name,access_password:password})
  });
  const d=await r.json();
  if(r.ok){
    document.getElementById('comm-message-input').value='';
    el.className='result-msg ok';
    el.textContent=password?'✓ Sent — password protected':'✓ Message sent encrypted';
    addChatMessage({
      type:'sent',message,sender:name,
      timestamp:new Date().toLocaleTimeString(),
      encrypted:true,status:'delivered',
      password_protected:bool(password)
    });
  }else{el.className='result-msg err';el.textContent='✗ '+(d.error||'Failed');}
}

async function sendFile(){
  const filePath = document.getElementById('comm-file-path').value.trim();
  const ip       = getPeerIP();
  const name     = getSenderName();
  const el       = document.getElementById('comm-file-result');
  const usePwd   = document.getElementById('use-file-password').checked;
  const password = usePwd ? document.getElementById('comm-file-password').value : null;

  if(!filePath){el.className='result-msg err';el.textContent='✗ Select a file first';return;}
  el.className='result-msg';el.textContent='Encrypting file...';

  const r=await fetch('/api/comm/send-file',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({file_path:filePath,receiver_ip:ip,sender_name:name,access_password:password})
  });
  const d=await r.json();
  if(r.ok){
    el.className='result-msg ok';
    el.innerHTML=`✓ <b>${d.filename}</b> sent${password?' — password protected':''}`;
    document.getElementById('comm-file-path').value='';
  }else{el.className='result-msg err';el.textContent='✗ '+(d.error||'Failed');}
}

let lockedMessages=[];
let currentLockedIndex=null;

function addChatMessage(msg){
  const el=document.getElementById('comm-messages');
  if(!el)return;
  const placeholder=el.querySelector('div[style*="text-align:center"]');
  if(placeholder)placeholder.remove();
  const isSent=msg.type==='sent'||msg.type==='sent_file';
  const isFile=msg.type==='sent_file'||msg.type==='received_file';
  const isLocked=msg.locked;

  if(isLocked){
    lockedMessages.push(msg);
    document.getElementById('unlock-panel').style.display='block';
  }

  el.innerHTML+=`
    <div style="display:flex;flex-direction:column;align-items:${isSent?'flex-end':'flex-start'};margin-bottom:12px;">
      <div style="font-size:0.63rem;color:#4c3d6e;margin-bottom:3px;">
        ${msg.sender||msg.from||'Unknown'} • ${msg.timestamp}
        <i class="fa-solid fa-lock" style="color:${isLocked?'#f59e0b':'#7c3aed'};margin-left:4px;"
          title="${isLocked?'Password protected':'Encrypted'}"></i>
        ${msg.password_protected&&!isLocked?'<i class="fa-solid fa-key" style="color:#f59e0b;margin-left:3px;" title="Was password protected"></i>':''}
      </div>
      <div style="max-width:85%;padding:10px 14px;
        border-radius:${isSent?'12px 12px 4px 12px':'12px 12px 12px 4px'};
        background:${isLocked?'rgba(245,158,11,0.1)':isSent?'linear-gradient(135deg,#7c3aed,#6d28d9)':'rgba(124,58,237,0.12)'};
        color:${isLocked?'#f59e0b':isSent?'#fff':'#c4b5fd'};
        font-size:0.8rem;line-height:1.5;
        border:1px solid ${isLocked?'rgba(245,158,11,0.3)':isSent?'transparent':'rgba(124,58,237,0.2)'};">
        ${isFile?'<i class="fa-solid fa-file" style="margin-right:6px;"></i>':''}
        ${isLocked?'<i class="fa-solid fa-lock" style="margin-right:6px;"></i>':''}
        ${msg.message}
      </div>
    </div>`;
  el.scrollTop=el.scrollHeight;
}

async function unlockMessage(){
  const password=document.getElementById('unlock-password').value;
  const el=document.getElementById('unlock-result');
  if(!password){el.className='result-msg err';el.textContent='✗ Enter password';return;}

  // Re-request with password
  el.className='result-msg';el.textContent='Unlocking...';

  // Find locked messages and try to unlock via API
  const r=await fetch('/api/comm/unlock-message',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({password})
  });
  const d=await r.json();
  if(r.ok){
    el.className='result-msg ok';el.textContent='✓ Message unlocked';
    document.getElementById('unlock-panel').style.display='none';
    document.getElementById('unlock-password').value='';
    loadCommHistory();
  }else{el.className='result-msg err';el.textContent='✗ '+(d.error||'Wrong password');}
}

function bool(v){return !!v;}

async function loadCommHistory(){
  const r=await fetch('/api/comm/history');
  const history=await r.json();
  if(!history.length)return;
  const el=document.getElementById('comm-messages');
  if(!el)return;
  el.innerHTML='';
  history.forEach(msg=>addChatMessage(msg));
  updateReceivedFiles(history);
}

function updateReceivedFiles(history){
  const el=document.getElementById('comm-received-files');
  if(!el)return;
  const files=history.filter(h=>h.type==='received_file');
  if(!files.length){el.textContent='No files received';return;}
  el.innerHTML=files.map(f=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;
      border-bottom:1px solid rgba(124,58,237,0.06);">
      <i class="fa-solid fa-file-shield" style="color:#a78bfa;font-size:0.8rem;"></i>
      <span style="color:#c4b5fd;flex:1;font-size:0.74rem;">${f.message.replace('File received: ','')}</span>
      <span style="color:#4c3d6e;font-size:0.66rem;">${f.timestamp}</span>
    </div>`).join('');
}

// Poll for new messages every 3 seconds
setInterval(async()=>{
  const tab=document.getElementById('tab-comm');
  if(!tab||!tab.classList.contains('active'))return;
  const r=await fetch('/api/comm/history');
  const history=await r.json();
  const el=document.getElementById('comm-messages');
  if(!el)return;
  // Only update if new messages
  if(history.length>0){
    el.innerHTML='';
    history.forEach(msg=>addChatMessage(msg));
    updateReceivedFiles(history);
  }
},3000);

// ── MAIN REFRESH ─────────────────────────────────────
async function refresh() {
  await Promise.all([fetchMonitor(), fetchAlerts(), fetchIDS()]);
}
