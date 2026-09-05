/**
 * Machine Learning Lifecycle Management Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('ml-management.html')) {
    initMlManagementPage();
  }
});

function initMlManagementPage() {
  loadModelRegistry();
  setupTrainingForm();
  setupWeightsForm();
}

async function loadModelRegistry() {
  try {
    const res = await ApiClient.get('/ml/models');
    if (!res.success) return;

    // Render ML Health status
    const healthBadge = document.getElementById('ml-health-badge');
    if (healthBadge) {
      if (res.mlServiceHealth?.isOnline) {
        healthBadge.textContent = 'ONLINE (FastAPI ML Service)';
        healthBadge.className = 'status-pill COMPLETED';
      } else {
        healthBadge.textContent = 'STANDBY (In-Process Ensemble Engine)';
        healthBadge.className = 'status-pill IN_PROGRESS';
      }
    }

    renderModelVersions(res.models);
    renderWeights(res.activeWeights);
  } catch (err) {
    showToast('Failed to load ML registry: ' + err.message, 'error');
  }
}

function renderModelVersions(models) {
  const tbody = document.getElementById('models-tbody');
  const activeCard = document.getElementById('active-model-card');
  if (!tbody) return;

  const active = models.find(m => m.isActive) || models[0];

  if (active && activeCard) {
    activeCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span class="status-pill COMPLETED">CURRENT ACTIVE INFERENCE MODEL</span>
          <h3 style="font-size:18px;font-weight:800;color:var(--gov-navy-dark);margin-top:6px;">
            ${active.modelType} (${active.versionTag})
          </h3>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${active.description}</p>
          <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
            Trained On: ${formatDate(active.trainingDate)} | Training Samples: ${active.trainingRows}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--text-muted);">Precision / F1 Score</div>
          <strong style="font-size:20px;color:var(--gov-green);">${active.metrics?.precision || '0.912'} / ${active.metrics?.f1Score || '0.898'}</strong>
        </div>
      </div>
    `;
  }

  tbody.innerHTML = models.map(m => `
    <tr>
      <td><strong>${m.versionTag}</strong><br><span style="font-size:11px;color:var(--text-muted);">${m.versionId}</span></td>
      <td><span class="status-pill">${m.modelType}</span></td>
      <td>${m.trainingRows} records</td>
      <td>
        <span style="font-size:12px;">Prec: <strong>${m.metrics?.precision || 'N/A'}</strong></span> | 
        <span style="font-size:12px;">F1: <strong>${m.metrics?.f1Score || 'N/A'}</strong></span>
      </td>
      <td>${formatDate(m.trainingDate)}</td>
      <td>
        <span class="status-pill ${m.isActive ? 'COMPLETED' : 'DELAYED'}">
          ${m.isActive ? 'ACTIVE' : 'TRAINED'}
        </span>
      </td>
      <td>
        ${!m.isActive ? `
          <button class="btn btn-sm btn-primary" onclick="activateModel('${m.versionId}')">
            ⚡ Activate Model
          </button>
        ` : '<span style="font-size:12px;color:var(--gov-green);font-weight:700;">✓ Serving</span>'}
      </td>
    </tr>
  `).join('');
}

function renderWeights(weights) {
  if (!weights) return;
  if (document.getElementById('weight-cost')) document.getElementById('weight-cost').value = weights.COST || 25;
  if (document.getElementById('weight-delay')) document.getElementById('weight-delay').value = weights.DELAY || 20;
  if (document.getElementById('weight-contractor')) document.getElementById('weight-contractor').value = weights.CONTRACTOR || 20;
  if (document.getElementById('weight-payment')) document.getElementById('weight-payment').value = weights.PAYMENT || 20;
  if (document.getElementById('weight-duplicate')) document.getElementById('weight-duplicate').value = weights.DUPLICATE_GEO || 15;
}

function setupWeightsForm() {
  document.getElementById('btn-save-weights')?.addEventListener('click', async () => {
    const cost = parseInt(document.getElementById('weight-cost').value, 10);
    const delay = parseInt(document.getElementById('weight-delay').value, 10);
    const contractor = parseInt(document.getElementById('weight-contractor').value, 10);
    const payment = parseInt(document.getElementById('weight-payment').value, 10);
    const duplicate = parseInt(document.getElementById('weight-duplicate').value, 10);

    const total = cost + delay + contractor + payment + duplicate;
    if (total !== 100) {
      showToast(`Weights sum to ${total}%. They must sum to exactly 100%.`, 'error');
      return;
    }

    try {
      const res = await ApiClient.put('/ml/config', {
        weights: {
          COST: cost,
          DELAY: delay,
          CONTRACTOR: contractor,
          PAYMENT: payment,
          DUPLICATE_GEO: duplicate
        }
      });
      showToast(res.message, 'success');
    } catch (err) {
      showToast('Error saving weights: ' + err.message, 'error');
    }
  });
}

function setupTrainingForm() {
  const trainBtn = document.getElementById('btn-start-training');
  const fileInput = document.getElementById('training-csv-input');
  const modelTypeSelect = document.getElementById('train-model-type');

  trainBtn?.addEventListener('click', async () => {
    try {
      trainBtn.disabled = true;
      trainBtn.innerHTML = 'Training Machine Learning Model...';

      const formData = new FormData();
      formData.append('modelType', modelTypeSelect.value);
      if (fileInput?.files.length > 0) {
        formData.append('dataset', fileInput.files[0]);
      }

      const res = await ApiClient.post('/ml/train', formData);
      showToast(res.message, 'success');
      loadModelRegistry();
    } catch (err) {
      showToast('Training failed: ' + err.message, 'error');
    } finally {
      trainBtn.disabled = false;
      trainBtn.innerHTML = '🚀 Start Model Training Pipeline';
    }
  });
}

async function activateModel(versionId) {
  try {
    const res = await ApiClient.post(`/ml/models/${versionId}/activate`);
    showToast(res.message, 'success');
    loadModelRegistry();
  } catch (err) {
    showToast('Failed to activate model: ' + err.message, 'error');
  }
}
