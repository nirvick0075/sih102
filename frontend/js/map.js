/**
 * Interactive Leaflet Map Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

let mapInstance = null;
let markersLayer = null;
let allProjectsData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('map.html')) {
    initMapPage();
  }
});

function initMapPage() {
  initLeafletMap();
  loadMapProjects();
  setupMapFilters();
}

function initLeafletMap() {
  const mapEl = document.getElementById('map-container');
  if (!mapEl) return;

  // Center on India
  mapInstance = L.map('map-container').setView([22.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors | MPLAD Intelligence GIS'
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
}

async function loadMapProjects() {
  try {
    const res = await ApiClient.get('/projects', { limit: 500 });
    if (!res.success) return;

    allProjectsData = res.projects;
    renderMapMarkers(allProjectsData);
  } catch (err) {
    showToast('Failed to load map data: ' + err.message, 'error');
  }
}

function renderMapMarkers(projects) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  const colorMap = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#ea580c',
    CRITICAL: '#dc2626'
  };

  projects.forEach(p => {
    if (!p.latitude || !p.longitude) return;

    const color = colorMap[p.riskLevel] || '#0284c7';
    const radius = p.riskLevel === 'CRITICAL' ? 10 : (p.riskLevel === 'HIGH' ? 8 : 6);

    const marker = L.circleMarker([p.latitude, p.longitude], {
      radius: radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    const popupContent = `
      <div class="map-popup-card">
        <h4>${p.projectName}</h4>
        <p><strong>ID:</strong> ${p.projectId} | <strong>Category:</strong> ${p.category}</p>
        <p><strong>Location:</strong> ${p.district}, ${p.state}</p>
        <div class="popup-score">
          <span class="risk-badge ${p.riskLevel}">Priority Score: ${p.aiScore}/100</span>
        </div>
        <p style="font-size:11px;color:#dc2626;margin-bottom:6px;">
          ${p.costDeviationPct > 15 ? `• Cost Overrun: +${p.costDeviationPct}%<br>` : ''}
          ${p.delayDays > 0 ? `• Delay: ${p.delayDays} days<br>` : ''}
        </p>
        <a href="project-details.html?id=${p.projectId}" class="btn btn-sm btn-primary" style="display:inline-block;width:100%;text-align:center;">
          Inspect 360° Dossier →
        </a>
      </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer.addLayer(marker);
  });
}

function setupMapFilters() {
  const riskFilter = document.getElementById('map-filter-risk');
  const stateFilter = document.getElementById('map-filter-state');

  const applyFilters = () => {
    const risk = riskFilter?.value;
    const state = stateFilter?.value;

    const filtered = allProjectsData.filter(p => {
      const matchRisk = !risk || p.riskLevel === risk;
      const matchState = !state || p.state === state;
      return matchRisk && matchState;
    });

    renderMapMarkers(filtered);
    showToast(`Showing ${filtered.length} projects on map.`, 'info');
  };

  riskFilter?.addEventListener('change', applyFilters);
  stateFilter?.addEventListener('change', applyFilters);
}
