/**
 * Blockchain Audit Ledger & Verification Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('blockchain.html')) {
    initBlockchainPage();
  }
});

function initBlockchainPage() {
  loadBlockchainLedger();
  setupVerificationCalculator();
}

async function loadBlockchainLedger() {
  const tbody = document.getElementById('blockchain-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">Querying distributed audit ledger...</td></tr>';
  }

  try {
    const res = await ApiClient.get('/blockchain/ledger');
    document.getElementById('ledger-total-count').textContent = res.totalEntries;
    document.getElementById('ledger-contract-address').textContent = res.smartContract;

    renderLedgerTable(res.records);
  } catch (err) {
    showToast('Failed to query blockchain ledger: ' + err.message, 'error');
  }
}

function renderLedgerTable(records) {
  const tbody = document.getElementById('blockchain-tbody');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No cryptographic records anchored yet.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong style="color:var(--gov-navy-dark);">${r.recordId}</strong></td>
      <td><span class="hash-pill">${r.recordHash}</span></td>
      <td><span class="hash-pill" style="color:#0284c7;">${r.txHash}</span></td>
      <td>#${r.blockNumber}</td>
      <td>${formatDate(r.timestamp)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="autofillVerifier('${r.recordId}', '${r.recordHash}')">
          Verify 🛡️
        </button>
      </td>
    </tr>
  `).join('');
}

function autofillVerifier(recordId, hash) {
  document.getElementById('verify-record-id').value = recordId;
  document.getElementById('verify-record-hash').value = hash;
  runVerification();
}

function setupVerificationCalculator() {
  document.getElementById('btn-run-verify')?.addEventListener('click', runVerification);
}

async function runVerification() {
  const recordId = document.getElementById('verify-record-id')?.value.trim();
  const currentHash = document.getElementById('verify-record-hash')?.value.trim();
  const resultBox = document.getElementById('verification-result-box');

  if (!recordId || !currentHash) {
    showToast('Please provide both Record ID and SHA-256 Hash.', 'error');
    return;
  }

  try {
    const res = await ApiClient.get(`/blockchain/verify/${recordId}`, { currentHash });
    const v = res.verification;

    resultBox.style.display = 'block';

    if (v.verified) {
      resultBox.innerHTML = `
        <div style="padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:var(--radius-sm);color:#065f46;">
          <div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;margin-bottom:8px;">
            <span>✓</span> <span>CRYPTOGRAPHIC INTEGRITY VERIFIED</span>
          </div>
          <p style="font-size:12px;margin-bottom:6px;">Record <strong>${v.recordId}</strong> matches the immutable smart contract anchor exactly.</p>
          <div style="font-size:11px;font-family:monospace;background:#ffffff;padding:8px;border-radius:4px;border:1px solid #a7f3d0;">
            • Blockchain Hash: ${v.blockchainHash}<br>
            • Candidate Hash:  ${v.currentHash}<br>
            • Block Number:    #${v.blockNumber}<br>
            • Transaction ID:  ${v.txHash}
          </div>
        </div>
      `;
      showToast('Integrity confirmed: SHA-256 matches blockchain ledger.', 'success');
    } else {
      resultBox.innerHTML = `
        <div style="padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-sm);color:#991b1b;">
          <div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;margin-bottom:8px;">
            <span>✗</span> <span>INTEGRITY CHECK FAILED / HASH MISMATCH</span>
          </div>
          <p style="font-size:12px;margin-bottom:6px;">The submitted record data has either been altered after submission or has not been registered on chain.</p>
          <div style="font-size:11px;font-family:monospace;background:#ffffff;padding:8px;border-radius:4px;border:1px solid #fecaca;">
            • Expected Blockchain Hash: ${v.blockchainHash || 'Not Found'}<br>
            • Candidate Submitted Hash: ${v.currentHash}
          </div>
        </div>
      `;
      showToast('Integrity check failed: Record altered or unregistered.', 'error');
    }
  } catch (err) {
    showToast('Verification error: ' + err.message, 'error');
  }
}
