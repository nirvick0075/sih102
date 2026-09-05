/**
 * Investigation Case File Details & Evidence Workbench Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

let currentInvestigationId = null;
let currentInvestigation = null;
let projectRecord = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('investigation-details.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    currentInvestigationId = urlParams.get('id');

    if (!currentInvestigationId) {
      showToast('No investigation ID specified.', 'error');
      setTimeout(() => window.location.href = 'investigations.html', 1000);
      return;
    }

    await loadInvestigationCaseFile(currentInvestigationId);
    setupWorkbenchHandlers();
  }
});

async function loadInvestigationCaseFile(id) {
  try {
    const res = await ApiClient.get(`/investigations/${id}`);
    if (!res.success) throw new Error(res.message);

    currentInvestigation = res.investigation;
    projectRecord = res.project;
    const inv = res.investigation;
    const p = res.project;

    // Header
    document.getElementById('inv-id-badge').textContent = inv.investigationId;
    document.getElementById('inv-project-title').textContent = `${p.projectId} - ${p.projectName}`;
    document.getElementById('inv-lead-name').textContent = inv.investigatorName;
    document.getElementById('inv-status-select').value = inv.status;

    // Project Risk Snapshot
    document.getElementById('inv-ai-score').textContent = `${p.aiScore}/100`;
    document.getElementById('inv-risk-badge').textContent = p.riskLevel;
    document.getElementById('inv-risk-badge').className = `risk-badge ${p.riskLevel}`;
    document.getElementById('inv-cost-dev').textContent = `${p.costDeviationPct}%`;
    document.getElementById('inv-delay-days').textContent = `${p.delayDays}d`;

    // Findings Form
    document.getElementById('inv-findings-text').value = inv.findings || '';
    document.getElementById('inv-action-text').value = inv.recommendedAction || '';

    // Blockchain Status
    const chainBox = document.getElementById('blockchain-status-box');
    if (chainBox) {
      if (inv.blockchainTx) {
        chainBox.innerHTML = `
          <div style="padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:var(--radius-sm);color:#065f46;font-size:12px;">
            <strong>🛡️ Blockchain Anchored Investigation Report</strong><br>
            <span style="font-family:monospace;">Tx: ${inv.blockchainTx}</span><br>
            <span style="font-size:11px;opacity:0.8;">Anchored At: ${formatDate(inv.blockchainTimestamp)}</span>
          </div>
        `;
      } else {
        chainBox.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">Report hash will be anchored to blockchain when findings are concluded.</span>';
      }
    }

    // Notes List
    renderNotesTimeline(inv.notes);

    // Evidence List
    renderEvidenceList(res.evidence);

  } catch (err) {
    showToast('Error loading case file: ' + err.message, 'error');
  }
}

function renderNotesTimeline(notes) {
  const container = document.getElementById('notes-timeline');
  if (!container) return;

  if (!notes || notes.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:12px;">No investigator notes logged yet.</p>';
    return;
  }

  container.innerHTML = notes.map(n => `
    <div style="padding:10px 14px;background:#f8fafc;border-left:3px solid var(--gov-blue);border-radius:4px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
        <strong>${n.authorName}</strong>
        <span>${formatDate(n.timestamp)}</span>
      </div>
      <p style="font-size:13px;color:var(--text-primary);">${n.text}</p>
    </div>
  `).join('');
}

function renderEvidenceList(evidence) {
  const container = document.getElementById('case-evidence-list');
  if (!container) return;

  if (!evidence || evidence.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:12px;">No evidence files attached to this case.</p>';
    return;
  }

  container.innerHTML = evidence.map(ev => `
    <div style="padding:12px;background:#ffffff;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong style="font-size:13px;">${ev.title}</strong>
        <div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-top:2px;">SHA-256: ${ev.fileHash.slice(0, 24)}...</div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="verifyEvidence('${ev.evidenceId}')">
        Verify Integrity
      </button>
    </div>
  `).join('');
}

async function verifyEvidence(evidenceId) {
  try {
    const res = await ApiClient.post(`/evidence/${evidenceId}/verify`);
    if (res.success && res.verificationResult.verified) {
      showToast('✓ Cryptographic evidence SHA-256 matches blockchain immutable record!', 'success');
    } else {
      showToast('✗ Evidence verification failed!', 'error');
    }
  } catch (err) {
    showToast('Verification failed: ' + err.message, 'error');
  }
}

function setupWorkbenchHandlers() {
  // Save Findings & Status
  document.getElementById('btn-save-findings')?.addEventListener('click', async () => {
    const status = document.getElementById('inv-status-select').value;
    const findings = document.getElementById('inv-findings-text').value.trim();
    const recommendedAction = document.getElementById('inv-action-text').value.trim();

    try {
      const res = await ApiClient.put(`/investigations/${currentInvestigationId}`, {
        status,
        findings,
        recommendedAction
      });

      showToast('Investigation findings and status saved successfully.', 'success');
      loadInvestigationCaseFile(currentInvestigationId);
    } catch (err) {
      showToast('Failed to save findings: ' + err.message, 'error');
    }
  });

  // Add Note Form
  document.getElementById('btn-add-note')?.addEventListener('click', async () => {
    const noteInput = document.getElementById('new-note-text');
    const noteText = noteInput.value.trim();
    if (!noteText) {
      showToast('Please type a note before submitting.', 'error');
      return;
    }

    try {
      await ApiClient.put(`/investigations/${currentInvestigationId}`, { noteText });
      noteInput.value = '';
      showToast('Note logged into case audit record.', 'success');
      loadInvestigationCaseFile(currentInvestigationId);
    } catch (err) {
      showToast('Error adding note: ' + err.message, 'error');
    }
  });

  // Upload Evidence Modal / Form
  const fileInput = document.getElementById('evidence-file-input');
  const uploadBtn = document.getElementById('btn-upload-evidence-file');

  uploadBtn?.addEventListener('click', async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      showToast('Please select a file to upload.', 'error');
      return;
    }

    const title = document.getElementById('evidence-title-input')?.value || fileInput.files[0].name;
    const description = document.getElementById('evidence-desc-input')?.value || '';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('projectId', projectRecord.projectId);
    formData.append('investigationId', currentInvestigationId);
    formData.append('title', title);
    formData.append('description', description);

    try {
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = 'Computing SHA-256 & Anchoring...';

      const res = await ApiClient.post('/evidence', formData);
      showToast(res.message, 'success');
      
      // Reset form
      fileInput.value = '';
      document.getElementById('evidence-title-input').value = '';
      document.getElementById('evidence-desc-input').value = '';
      
      loadInvestigationCaseFile(currentInvestigationId);
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = 'Upload & Anchor to Blockchain';
    }
  });
}
