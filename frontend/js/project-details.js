/**
 * Project Details & 360-Degree Dossier Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

let currentProjectId = null;
let projectData = null;
let xaiChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('project-details.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');

    if (!currentProjectId) {
      showToast('No project ID specified in URL.', 'error');
      setTimeout(() => window.location.href = 'projects.html', 1000);
      return;
    }

    await loadProjectDossier(currentProjectId);
    setupActionHandlers();
  }
});

async function loadProjectDossier(id) {
  try {
    const res = await ApiClient.get(`/projects/${id}`);
    if (!res.success) throw new Error(res.message);

    projectData = res;
    const p = res.project;
    const c = res.contractor;
    const inv = res.investigation;

    // Header & Meta
    document.getElementById('p-id').textContent = p.projectId;
    document.getElementById('p-title').textContent = p.projectName;
    document.getElementById('p-location').textContent = `${p.location || p.district}, ${p.district}, ${p.state}`;
    document.getElementById('p-category').textContent = p.category;
    
    const statusEl = document.getElementById('p-status');
    statusEl.textContent = p.projectStatus;
    statusEl.className = `status-pill ${p.projectStatus}`;

    // Explainable AI & Score Meter
    renderExplainableAI(p);

    // Financial Metrics
    document.getElementById('p-sanctioned').textContent = formatCurrency(p.sanctionedAmount);
    document.getElementById('p-estimated').textContent = formatCurrency(p.estimatedCost);
    document.getElementById('p-actual').textContent = formatCurrency(p.actualCost);
    document.getElementById('p-paid').textContent = formatCurrency(p.paymentAmount);
    
    const costDevEl = document.getElementById('p-cost-deviation');
    costDevEl.textContent = `${p.costDeviationPct > 0 ? '+' : ''}${p.costDeviationPct}%`;
    costDevEl.style.color = p.costDeviationPct > 15 ? '#dc2626' : (p.costDeviationPct < 0 ? '#10b981' : 'inherit');

    // Timeline
    document.getElementById('p-start-date').textContent = formatDate(p.startDate);
    document.getElementById('p-expected-date').textContent = formatDate(p.expectedCompletionDate);
    document.getElementById('p-delay-days').textContent = `${p.delayDays} Days`;

    // Contractor Snapshot
    if (c) {
      document.getElementById('c-name').textContent = c.name;
      document.getElementById('c-reg').textContent = c.registrationNumber;
      document.getElementById('c-delay-rate').textContent = `${c.delayRate}%`;
      document.getElementById('c-overrun-rate').textContent = `${c.costOverrunRate}%`;
      document.getElementById('c-anomaly-rate').textContent = `${c.anomalyRate}%`;
      document.getElementById('c-verified-issues').textContent = `${c.verifiedIssueProjects} issues`;
    }

    // Milestones
    renderMilestones(res.milestones);

    // Payments
    renderPayments(res.payments);

    // Evidence
    renderEvidence(res.evidence);

    // Investigation Section
    renderInvestigationSection(inv, p);

  } catch (err) {
    showToast('Failed to load project details: ' + err.message, 'error');
  }
}

function renderExplainableAI(project) {
  const scoreContainer = document.getElementById('score-meter-container');
  if (scoreContainer) {
    scoreContainer.innerHTML = `
      <div class="score-badge-large ${project.riskLevel}">
        <span class="num">${project.aiScore}</span>
        <span class="max">/ 100</span>
      </div>
      <div class="score-details">
        <h4>Investigation Priority: <span class="risk-badge ${project.riskLevel}">${project.riskLevel}</span></h4>
        <p>Calculated using Isolation Forest ensemble and rule-based heuristic anomaly indicators.</p>
        <span style="font-size:11px;color:var(--text-muted);">
          * Note: This score indicates prioritized investigation need, NOT proof of fraud.
        </span>
      </div>
    `;
  }

  // Factor Progress Bars
  const factorContainer = document.getElementById('factor-bars-container');
  if (factorContainer && project.riskFactors) {
    factorContainer.innerHTML = project.riskFactors.map(f => {
      const cls = f.category.toLowerCase().replace('_', '-');
      return `
        <div class="factor-bar-group">
          <div class="factor-bar-header">
            <span>${f.name}</span>
            <span style="color:var(--text-secondary);">${f.score}/100 (${f.contributionPct}% contribution)</span>
          </div>
          <div class="factor-progress-track">
            <div class="factor-progress-fill ${cls}" style="width: ${Math.min(100, f.score)}%;"></div>
          </div>
          <p style="font-size:11px;color:var(--text-muted);margin-top:2px;">${f.description}</p>
        </div>
      `;
    }).join('');
  }

  // Anomaly Reasons
  const reasonsList = document.getElementById('anomaly-reasons-list');
  if (reasonsList && project.anomalyReasons) {
    reasonsList.innerHTML = project.anomalyReasons.map(r => `
      <li>
        <span style="font-size:14px;">⚠️</span>
        <span>${r}</span>
      </li>
    `).join('');
  }
}

function renderMilestones(milestones) {
  const container = document.getElementById('milestones-list');
  if (!container) return;

  if (!milestones || milestones.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:12px;">No milestones recorded.</p>';
    return;
  }

  container.innerHTML = milestones.map(m => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e2e8f0;">
      <div>
        <div style="font-weight:600;font-size:13px;">${m.name}</div>
        <div style="font-size:11px;color:var(--text-muted);">Target: ${formatDate(m.expectedDate)}</div>
      </div>
      <span class="status-pill ${m.status}">${m.status}</span>
    </div>
  `).join('');
}

function renderPayments(payments) {
  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;

  if (!payments || payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:#94a3b8;">No payment records found.</td></tr>';
    return;
  }

  tbody.innerHTML = payments.map(p => `
    <tr>
      <td>${p.paymentId}</td>
      <td><strong>${formatCurrency(p.amount)}</strong></td>
      <td>${formatDate(p.paymentDate)}</td>
      <td><span class="status-pill COMPLETED">${p.paymentStatus}</span></td>
    </tr>
  `).join('');
}

function renderEvidence(evidenceList) {
  const container = document.getElementById('evidence-gallery');
  if (!container) return;

  if (!evidenceList || evidenceList.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:12px;">No evidence documents uploaded yet.</p>';
    return;
  }

  container.innerHTML = evidenceList.map(ev => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:13px;">${ev.title}</strong>
        <span style="font-size:11px;color:var(--text-muted);">${formatDate(ev.uploadedAt)}</span>
      </div>
      <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">${ev.description || ev.fileName}</p>
      <div style="margin-bottom:8px;">
        <span style="font-size:11px;color:var(--text-muted);">SHA-256 Hash:</span>
        <span class="hash-pill">${ev.fileHash}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <button class="btn btn-sm btn-secondary" onclick="verifyEvidence('${ev.evidenceId}')">
          🛡️ Verify On Blockchain
        </button>
        <span id="evidence-verify-status-${ev.evidenceId}"></span>
      </div>
    </div>
  `).join('');
}

async function verifyEvidence(evidenceId) {
  const statusEl = document.getElementById(`evidence-verify-status-${evidenceId}`);
  if (statusEl) statusEl.innerHTML = '<span style="font-size:11px;color:var(--gov-blue);">Checking ledger...</span>';

  try {
    const res = await ApiClient.post(`/evidence/${evidenceId}/verify`);
    if (res.success && res.verificationResult.verified) {
      if (statusEl) {
        statusEl.innerHTML = '<span class="integrity-badge VERIFIED">✓ Blockchain Integrity Verified</span>';
      }
      showToast('Evidence SHA-256 hash verified against blockchain ledger.', 'success');
    } else {
      if (statusEl) {
        statusEl.innerHTML = '<span class="integrity-badge FAILED">✗ Integrity Check Failed</span>';
      }
      showToast('Evidence verification failed: hash mismatch or not registered.', 'error');
    }
  } catch (err) {
    showToast('Verification error: ' + err.message, 'error');
  }
}

function renderInvestigationSection(investigation, project) {
  const invContainer = document.getElementById('investigation-section-content');
  if (!invContainer) return;

  if (!investigation) {
    invContainer.innerHTML = `
      <div style="padding:20px;text-align:center;background:#f8fafc;border-radius:var(--radius-sm);border:1px dashed #cbd5e1;">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
          This project has not yet been assigned an active formal investigation.
        </p>
        <button class="btn btn-primary investigator-only" id="btn-start-inv">
          🔍 Start Formal Investigation
        </button>
      </div>
    `;
    document.getElementById('btn-start-inv')?.addEventListener('click', startNewInvestigation);
  } else {
    invContainer.innerHTML = `
      <div style="padding:16px;background:#f8fafc;border-radius:var(--radius-sm);border:1px solid #e2e8f0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <strong style="font-size:14px;color:var(--gov-navy-dark);">${investigation.investigationId}</strong>
            <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">Assigned: ${investigation.investigatorName}</span>
          </div>
          <span class="status-pill ${investigation.status}">${investigation.status}</span>
        </div>
        <p style="font-size:13px;margin-bottom:10px;"><strong>Findings:</strong> ${investigation.findings || 'Investigation in progress.'}</p>
        ${investigation.blockchainTx ? `
          <div style="margin-top:10px;padding:8px;background:#ecfdf5;border-radius:4px;border:1px solid #a7f3d0;font-size:11px;color:#065f46;">
            🛡️ Report Anchored on Blockchain: <code>${investigation.blockchainTx.slice(0, 24)}...</code>
          </div>
        ` : ''}
        <div style="margin-top:14px;display:flex;gap:10px;">
          <a href="investigation-details.html?id=${investigation.investigationId}" class="btn btn-sm btn-primary">
            Open Case File →
          </a>
        </div>
      </div>
    `;
  }
}

async function startNewInvestigation() {
  try {
    const res = await ApiClient.post('/investigations', { projectId: currentProjectId });
    showToast(res.message, 'success');
    loadProjectDossier(currentProjectId);
  } catch (err) {
    showToast('Failed to start investigation: ' + err.message, 'error');
  }
}

function setupActionHandlers() {
  // Print / PDF Report handler
  document.getElementById('btn-print-report')?.addEventListener('click', () => {
    window.print();
  });

  // Re-evaluate button
  document.getElementById('btn-reevaluate-ai')?.addEventListener('click', async () => {
    try {
      showToast('Re-running ML isolation model & Explainable AI analysis...', 'info');
      const res = await ApiClient.post(`/projects/${currentProjectId}/re-evaluate`);
      showToast(res.message, 'success');
      loadProjectDossier(currentProjectId);
    } catch (err) {
      showToast('Evaluation error: ' + err.message, 'error');
    }
  });
}
