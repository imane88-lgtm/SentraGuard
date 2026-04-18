async function genKey() {
  const keyName = document.getElementById('enc-key').value.trim() || 'default';
  const r = await fetch('/api/encryption/generate-key', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({key_name: keyName})
  });
  const d = await r.json();
  const el = document.getElementById('enc-result');
  if (r.ok) {
    el.style.color = '#00ff88';
    el.textContent = '✓ Key generated: ' + keyName;
  } else {
    el.style.color = '#ff4444';
    el.textContent = '✗ ' + (d.error || 'Failed');
  }
}

async function encryptFile() {
  const path = document.getElementById('enc-path').value.trim();
  const keyName = document.getElementById('enc-key').value.trim() || 'default';
  const el = document.getElementById('enc-result');

  if (!path) { el.style.color='#ff4444'; el.textContent='✗ Enter file path'; return; }

  el.style.color = '#4a6fa5';
  el.textContent = 'Encrypting...';

  const r = await fetch('/api/encryption/encrypt', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({file_path: path, key_name: keyName})
  });
  const d = await r.json();

  if (r.ok) {
    el.style.color = '#00ff88';
    el.textContent = '✓ Encrypted → ' + d.output;
    // Auto-fill decrypt field
    document.getElementById('dec-path').value = d.output;
    document.getElementById('dec-key').value = keyName;
    // Log alert
    await fetch('/api/alerts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        level: 'info',
        message: 'File encrypted: ' + path,
        source: 'encryption'
      })
    });
  } else {
    el.style.color = '#ff4444';
    el.textContent = '✗ ' + (d.error || 'Encryption failed');
  }
}

async function decryptFile() {
  const path = document.getElementById('dec-path').value.trim();
  const keyName = document.getElementById('dec-key').value.trim() || 'default';
  const el = document.getElementById('dec-result');

  if (!path) { el.style.color='#ff4444'; el.textContent='✗ Enter file path'; return; }

  el.style.color = '#4a6fa5';
  el.textContent = 'Decrypting...';

  const r = await fetch('/api/encryption/decrypt', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({file_path: path, key_name: keyName})
  });
  const d = await r.json();

  if (r.ok) {
    el.style.color = '#00ff88';
    el.textContent = '✓ Decrypted → ' + d.output;
    await fetch('/api/alerts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        level: 'info',
        message: 'File decrypted: ' + path,
        source: 'encryption'
      })
    });
  } else {
    el.style.color = '#ff4444';
    el.textContent = '✗ ' + (d.error || 'Decryption failed');
  }
}

