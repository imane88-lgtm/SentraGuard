async function browseFile(targetId) {
  const r = await fetch('/api/pick-file');
  if (r.status === 200) {
    const d = await r.json();
    document.getElementById(targetId).value = d.path;
  }
}

async function genKey() {
  const keyName = document.getElementById('enc-key').value.trim() || 'default';
  const r = await fetch('/api/encryption/generate-key', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({key_name: keyName})
  });
  const d = await r.json();
  const el = document.getElementById('enc-result');
  el.className = 'result-msg ' + (r.ok ? 'ok' : 'err');
  el.textContent = r.ok ? '✓ Key generated: ' + keyName : '✗ ' + d.error;
}

async function encryptFile() {
  const path      = document.getElementById('enc-path').value.trim();
  const keyName   = document.getElementById('enc-key').value.trim() || 'default';
  const password  = document.getElementById('enc-pass').value || null;
  const unlockVal = document.getElementById('enc-unlock').value;
  const unlock_time = unlockVal ? new Date(unlockVal).toISOString() : null;
  const el = document.getElementById('enc-result');

  if (!path) { el.className='result-msg err'; el.textContent='✗ Select or enter a file path'; return; }
  el.className='result-msg'; el.textContent='Encrypting...';

  const r = await fetch('/api/encryption/encrypt', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({file_path: path, key_name: keyName, password, unlock_time})
  });
  const d = await r.json();

  if (r.ok) {
    const m = d.metadata;
    el.className = 'result-msg ok';
    el.innerHTML = `
      ✓ Encrypted → <b>${d.output}</b><br>
      <span style="color:#6b5fa0; font-size:0.72rem;">
        Hash: ${m.hash ? m.hash.substring(0,32)+'...' : 'N/A'}<br>
        Date: ${m.encrypted_at}<br>
        ${m.unlock_time ? '&#128274; Locked until: ' + m.unlock_time : ''}
        ${m.password_protected ? '&#128272; Password protected' : ''}
      </span>`;
    document.getElementById('dec-path').value = d.output;
    document.getElementById('dec-key').value = keyName;
  } else {
    el.className = 'result-msg err';
    el.textContent = '✗ ' + d.error;
  }
}

async function decryptFile() {
  const path     = document.getElementById('dec-path').value.trim();
  const keyName  = document.getElementById('dec-key').value.trim() || 'default';
  const password = document.getElementById('dec-pass').value || null;
  const el = document.getElementById('dec-result');

  if (!path) { el.className='result-msg err'; el.textContent='✗ Select or enter a file path'; return; }
  el.className='result-msg'; el.textContent='Decrypting...';

  const r = await fetch('/api/encryption/decrypt', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({file_path: path, key_name: keyName, password})
  });
  const d = await r.json();

  if (r.ok) {
    const m = d.metadata;
    el.className = 'result-msg ok';
    el.innerHTML = `
      ✓ Decrypted → <b>${d.output}</b><br>
      <span style="color:#6b5fa0; font-size:0.72rem;">
        Original: ${m.filename} | Hash verified ✓
      </span>`;
  } else {
    el.className = 'result-msg err';
    el.textContent = '✗ ' + d.error;
  }
}

async function hashFile() {
  const path = document.getElementById('hash-path').value.trim();
  const el = document.getElementById('hash-result');
  if (!path) { el.textContent = 'Select or enter a file path'; return; }

  const r = await fetch('/api/encryption/hash', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({file_path: path})
  });
  const d = await r.json();

  if (r.ok) {
    el.innerHTML = `
      <div style="margin-bottom:6px; color:#a78bfa">${d.filename}</div>
      <div style="margin-bottom:6px; color:#6b5fa0; font-size:0.72rem;">Size: ${d.size_bytes} bytes</div>
      <div style="word-break:break-all; color:#818cf8; font-family:monospace; font-size:0.75rem;">
        SHA-256: ${d.hash}
      </div>`;
  } else {
    el.innerHTML = `<span style="color:#f87171">✗ ${d.error}</span>`;
  }
}
