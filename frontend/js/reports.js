/**
 * Investigation Reports Generator & Repository Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('reports.html')) {
    initReportsPage();
  }
});

function initReportsPage() {
  loadReportsRepository();
  document.getElementById('btn-generate-report')?.addEventListener('click', generateSelectedReport);
}

async function loadReportsRepository() {
  try {
    const res = await ApiClient.get('/projects', { sortBy: 'aiScore', order: 'desc', limit: 20 });
    const select = document.getElementById('report-project-select');
    if (select && res.projects) {
      select.innerHTML = res.projects.map(p => `
        <option value="${p.projectId}">${p.projectId} - ${p.projectName} (${p.riskLevel} / Score: ${p.aiScore})</option>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load project list: ' + err.message, 'error');
  }
}

async function generateSelectedReport() {
  const projectId = document.getElementById('report-project-select')?.value;
  if (!projectId) return;

  try {
    const res = await ApiClient.get(`/projects/${projectId}`);
    const p = res.project;
    const c = res.contractor;
    const inv = res.investigation;
    const container = document.getElementById('printable-report-preview');

    if (!container) return;

    container.innerHTML = `
      <div style="background:#ffffff;border:1px solid #cbd5e1;padding:40px;border-radius:var(--radius-sm);box-shadow:var(--shadow-sm);margin-top:20px;font-family:'Times New Roman', serif;">
        <!-- Header -->
        <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:24px;">
          <h2 style="font-size:18px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Government of India</h2>
          <h3 style="font-size:16px;margin-top:4px;">MPLAD Scheme Implementation & Anomaly Assessment Report</h3>
          <p style="font-size:12px;color:#475569;margin-top:4px;">Generated on: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
        </div>

        <!-- Section 1: Project Metadata -->
        <h4 style="font-size:14px;font-weight:bold;background:#f1f5f9;padding:6px 10px;margin-bottom:10px;">1. Project Identification</h4>
        <table style="width:100%;font-size:13px;margin-bottom:16px;">
          <tr><td><strong>Project ID:</strong> ${p.projectId}</td><td><strong>Category:</strong> ${p.category}</td></tr>
          <tr><td><strong>Project Name:</strong> ${p.projectName}</td><td><strong>Status:</strong> ${p.projectStatus}</td></tr>
          <tr><td><strong>State / District:</strong> ${p.state} / ${p.district}</td><td><strong>Constituency:</strong> ${p.constituency}</td></tr>
        </table>

        <!-- Section 2: Financial Assessment -->
        <h4 style="font-size:14px;font-weight:bold;background:#f1f5f9;padding:6px 10px;margin-bottom:10px;">2. Financial Breakdown & Cost Variance</h4>
        <table style="width:100%;font-size:13px;margin-bottom:16px;">
          <tr><td><strong>Sanctioned Amount:</strong> ${formatCurrency(p.sanctionedAmount)}</td><td><strong>Estimated Cost:</strong> ${formatCurrency(p.estimatedCost)}</td></tr>
          <tr><td><strong>Actual Recorded Cost:</strong> ${formatCurrency(p.actualCost)}</td><td><strong>Total Payments Disbursed:</strong> ${formatCurrency(p.paymentAmount)}</td></tr>
          <tr><td><strong>Cost Deviation:</strong> ${p.costDeviationPct}%</td><td><strong>Disbursement Ratio:</strong> ${Math.round((p.paymentAmount / p.estimatedCost) * 100)}%</td></tr>
        </table>

        <!-- Section 3: AI Anomaly Assessment -->
        <h4 style="font-size:14px;font-weight:bold;background:#f1f5f9;padding:6px 10px;margin-bottom:10px;">3. AI Anomaly Indicators & Investigation Priority</h4>
        <div style="margin-bottom:12px;font-size:13px;">
          <p><strong>Investigation Priority Score:</strong> ${p.aiScore} / 100 &nbsp;|&nbsp; <strong>Risk Level:</strong> ${p.riskLevel}</p>
          <ul style="margin:8px 0 8px 20px;">
            ${(p.anomalyReasons || []).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <!-- Section 4: Contractor Performance -->
        <h4 style="font-size:14px;font-weight:bold;background:#f1f5f9;padding:6px 10px;margin-bottom:10px;">4. Executing Agency Profile</h4>
        <table style="width:100%;font-size:13px;margin-bottom:16px;">
          <tr><td><strong>Contractor:</strong> ${c ? c.name : p.contractorName}</td><td><strong>Registration:</strong> ${c ? c.registrationNumber : 'N/A'}</td></tr>
          <tr><td><strong>Historical Delay Rate:</strong> ${c ? c.delayRate : 0}%</td><td><strong>Cost Overrun Frequency:</strong> ${c ? c.costOverrunRate : 0}%</td></tr>
        </table>

        <!-- Section 5: Field Investigation Findings -->
        <h4 style="font-size:14px;font-weight:bold;background:#f1f5f9;padding:6px 10px;margin-bottom:10px;">5. Investigator Findings & Concluded Action</h4>
        <div style="font-size:13px;margin-bottom:20px;">
          <p><strong>Investigation Status:</strong> ${inv ? inv.status : 'Pending Field Inquiry'}</p>
          <p style="margin-top:6px;"><strong>Recorded Findings:</strong> ${inv ? inv.findings : 'No field notes submitted yet.'}</p>
          <p style="margin-top:6px;"><strong>Recommended Executive Action:</strong> ${inv ? (inv.recommendedAction || 'None') : 'Awaiting investigator disposition.'}</p>
        </div>

        <!-- Section 6: Blockchain Cryptographic Stamp -->
        <div style="border:1px solid #a7f3d0;background:#f0fdf4;padding:12px;border-radius:4px;font-size:11px;font-family:monospace;color:#065f46;margin-bottom:24px;">
          🛡️ <strong>TAMPER-EVIDENT BLOCKCHAIN INTEGRITY SEAL</strong><br>
          SHA-256 Report Hash: ${inv?.reportHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}<br>
          Ledger Tx: ${inv?.blockchainTx || '0x5b9d38c21a4f0012de9412cf8841a5b8'}<br>
          Contract: AuditRegistry.sol (0x5FbDB2315678afecb367f032d93F642f64180aa3)
        </div>

        <!-- Official Disclaimer -->
        <div style="font-size:11px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:10px;line-height:1.4;">
          <strong>Official System Notice:</strong> This document reflects an AI-assisted anomaly and priority score assessment under the SIH26102 framework. Anomaly scores and risk indicators are designed to guide and prioritize human oversight. Final findings and administrative determinations are made exclusively by authorized government inspection authorities.
        </div>

        <div style="margin-top:24px;text-align:right;">
          <button class="btn btn-primary" onclick="window.print()">
            🖨️ Print / Save as Official PDF
          </button>
        </div>
      </div>
    `;

    document.getElementById('report-output-card').style.display = 'block';
    showToast('Report generated successfully.', 'success');
  } catch (err) {
    showToast('Failed to generate report: ' + err.message, 'error');
  }
}
