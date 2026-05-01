// /static/encryption.js

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

function setResult(id, msg, type = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `result-msg ${type}`.trim();
  el.textContent = msg;
}

// ── FILE BROWSER ─────────────────────────────────────
async function browseFile(targetId) {
  try {
    const { ok, data } = await fetchJson('/api/pick-file');
    if (!ok || !data?.path) return;

    const el = document.getElementById(targetId);
    if (el) el.value = data.path;
  } catch (e) {
    console.error('browseFile:', e);
  }
}

// ── KEY GENERATION ───────────────────────────────────
async function genKey() {
  const keyName = document.getElementById('enc-key')?.value.trim() || 'default';
  const el = document.getElementById('enc-result');
  if (!el) return;

  el.className = 'result-msg';
  el.textContent = 'Generating key...';

  try {
    const { ok, data } = await fetchJson('/api/encryption/generate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_name: keyName })
    });

    if (ok) {
      el.className = 'result-msg ok';
      el.textContent = `✓ Key generated: ${keyName}`;
    } else {
      el.className = 'result-msg err';
      el.textContent = `✗ ${data?.error || 'Failed to generate key'}`;
    }
  } catch (e) {
    console.error('genKey:', e);
    el.className = 'result-msg err';
    el.textContent = '✗ Key generation failed';
  }
}

// ── TIMLOCK PREVIEW ──────────────────────────────────
function updateTimelockPreview() {
  const input = document.getElementById('enc-unlock');
  const preview = document.getElementById('timelock-preview');
  if (!input || !preview) return;

  if (!input.value) {
    preview.textContent = '';
    preview.style.color = '#6b5fa0';
    return;
  }

  const dt = new Date(input.value);
  const now = new Date();
  const diff = dt - now;

  if (Number.isNaN(dt.getTime())) {
    preview.textContent = '⚠ Invalid date';
    preview.style.color = '#f87171';
    return;
  }

  if (diff <= 0) {
    preview.textContent = '⚠ Date is in the past — timelock will not apply';
    preview.style.color = '#f87171';
    return;
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  let text = '🔒 Will lock for ';
  if (days > 0) text += `${days}d `;
  text += `${hours}h ${minutes}m`;
  preview.textContent = text;
  preview.style.color = '#f59e0b';
}

document.addEventListener('DOMContentLoaded', () => {
  const timelockInput = document.getElementById('enc-unlock');
  if (timelockInput) {
    timelockInput.addEventListener('change', updateTimelockPreview);
    timelockInput.addEventListener('input', updateTimelockPreview);
  }
});

// ── ENCRYPT ──────────────────────────────────────────
async function encryptFile() {
  const path = document.getElementById('enc-path')?.value.trim();
  const keyName = document.getElementById('enc-key')?.value.trim() || 'default';
  const password = document.getElementById('enc-pass')?.value || null;
  const el = document.getElementById('enc-result');

  const unlockInput = document.getElementById('enc-unlock');
  let unlock_time = null;
  if (unlockInput?.value) {
    unlock_time = new Date(unlockInput.value).toISOString();
  }

  if (!el) return;

  if (!path) {
    el.className = 'result-msg err';
    el.textContent = '✗ Select or enter a file path';
    return;
  }

  el.className = 'result-msg';
  el.textContent = 'Encrypting...';

  try {
    const { ok, data } = await fetchJson('/api/encryption/encrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: path, key_name: keyName, password, unlock_time })
    });

    if (ok) {
      const m = data?.metadata || {};
      el.className = 'result-msg ok';
      el.innerHTML = `
        ✓ Encrypted → <b>${esc(data?.output || '')}</b><br>
        <span style="color:#6b5fa0;font-size:0.7rem;line-height:1.8;">
          SHA-256: ${esc(m.hash ? `${String(m.hash).substring(0, 32)}...` : 'N/A')}<br>
          Encrypted at: ${esc(m.encrypted_at || '--')}<br>
          ${m.unlock_time ? `🔒 Locked until: <b style="color:#f59e0b;">${esc(m.unlock_time)}</b>` : ''}
          ${m.password_protected ? '<br>🔐 Password protected' : ''}
        </span>
      `;

      const dp = document.getElementById('dec-path');
      const dk = document.getElementById('dec-key');
      if (dp) dp.value = data?.output || '';
      if (dk) dk.value = keyName;

      if (unlockInput) unlockInput.value = '';
      const tp = document.getElementById('timelock-preview');
      if (tp) tp.textContent = '';
    } else {
      el.className = 'result-msg err';
      el.textContent = `✗ ${data?.error || 'Encryption failed'}`;
    }
  } catch (e) {
    console.error('encryptFile:', e);
    el.className = 'result-msg err';
    el.textContent = '✗ Encryption failed';
  }
}

// ── DECRYPT ──────────────────────────────────────────
async function decryptFile() {
  const path = document.getElementById('dec-path')?.value.trim();
  const keyName = document.getElementById('dec-key')?.value.trim() || 'default';
  const password = document.getElementById('dec-pass')?.value || null;
  const el = document.getElementById('dec-result');

  if (!el) return;

  if (!path) {
    el.className = 'result-msg err';
    el.textContent = '✗ Select or enter a file path';
    return;
  }

  el.className = 'result-msg';
  el.textContent = 'Decrypting...';

  try {
    const { ok, data } = await fetchJson('/api/encryption/decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: path, key_name: keyName, password })
    });

    if (ok) {
      const m = data?.metadata || {};
      el.className = 'result-msg ok';
      el.innerHTML = `
        ✓ Decrypted → <b>${esc(data?.output || '')}</b><br>
        <span style="color:#6b5fa0;font-size:0.7rem;">
          Original: ${esc(m.filename || '--')}
          ${m.hash_verified === true ? ' | Hash verified ✓' : ''}
        </span>
      `;
    } else {
      el.className = 'result-msg err';
      el.textContent = `✗ ${data?.error || 'Decryption failed'}`;
    }
  } catch (e) {
    console.error('decryptFile:', e);
    el.className = 'result-msg err';
    el.textContent = '✗ Decryption failed';
  }
}

// ── HASH (encryption tab) ────────────────────────────
async function hashFile() {
  const path = document.getElementById('hash-path')?.value.trim();
  const el = document.getElementById('hash-result');
  if (!el) return;

  if (!path) {
    el.textContent = 'Enter or browse a file path';
    return;
  }

  el.textContent = 'Computing hash...';
  el.style.color = '#6b5fa0';

  try {
    const { ok, data } = await fetchJson('/api/encryption/hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: path })
    });

    if (ok) {
      el.style.color = '#a78bfa';
      el.innerHTML = `
        <div style="margin-bottom:5px;">
          <span style="color:#6b5fa0;font-size:0.68rem;">FILE</span>
          <span style="color:#c4b5fd;font-weight:600;margin-left:8px;">${esc(data?.filename || '')}</span>
          <span style="color:#4c3d6e;font-size:0.68rem;margin-left:8px;">${esc(data?.size_bytes ?? '--')} bytes</span>
        </div>
        <div style="font-family:monospace;font-size:0.74rem;color:#818cf8;word-break:break-all;
          background:rgba(124,58,237,0.06);padding:8px 10px;border-radius:6px;
          border-left:3px solid #7c3aed;">
          ${esc(data?.hash || '')}
        </div>
      `;
    } else {
      el.style.color = '#f87171';
      el.textContent = `✗ ${data?.error || 'File not found'}`;
    }
  } catch (e) {
    console.error('hashFile:', e);
    el.style.color = '#f87171';
    el.textContent = '✗ File not found';
  }
}
