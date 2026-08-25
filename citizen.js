const socket = io();

let map, shelterLayer;
let currentLang = "en";
let lastCommunication = null;
let sheltersData = [];

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key];
}

function applyStaticTranslations() {
  document.querySelector('[data-i18n="nearestShelters"]');
}

function initMap() {
  map = L.map("citizen-map").setView([23.2599, 77.4126], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18
  }).addTo(map);
  shelterLayer = L.layerGroup().addTo(map);
}

function renderShelters(shelters) {
  sheltersData = shelters;
  shelterLayer.clearLayers();
  const listEl = document.getElementById("shelterList");
  listEl.innerHTML = "";

  shelters.forEach((s) => {
    const isFull = s.occupied >= s.capacity;
    const pct = Math.round((s.occupied / s.capacity) * 100);

    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 9,
      color: isFull ? "#d7263d" : "#1b998b",
      fillColor: isFull ? "#d7263d" : "#1b998b",
      fillOpacity: 0.8,
      weight: 2
    }).addTo(shelterLayer);
    marker.bindPopup(
      `<strong>${s.name}</strong><br/>Capacity: ${s.occupied}/${s.capacity}<br/>Medical stock: ${s.medicalStock}`
    );

    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <div><strong>${s.name}</strong></div>
        <div class="meta">Medical: ${s.medicalStock} · Water: ${s.waterStock}</div>
        <div class="progress-bar" style="width:200px;">
          <div class="progress-fill ${pct > 85 ? "danger" : pct > 50 ? "warn" : ""}" style="width:${pct}%;"></div>
        </div>
      </div>
      <span class="badge ${isFull ? "badge-full" : "badge-open"}">${isFull ? t("full") : t("open")}</span>
    `;
    listEl.appendChild(row);
  });
}

function showAlert(communication) {
  if (!communication || !communication.alerts) return;
  lastCommunication = communication;
  const alertForLang =
    communication.alerts.find((a) => a.lang === currentLang) ||
    communication.alerts[0];

  const banner = document.getElementById("alertBanner");
  document.getElementById("alertTitle").textContent = alertForLang.title;
  document.getElementById("alertBody").textContent = alertForLang.body;
  document.getElementById("alertChannelTag").textContent =
    (communication.channels || []).join(" · ") || "MULTI-CHANNEL ALERT";
  banner.classList.add("show");

  const historyEl = document.getElementById("alertHistory");
  const item = document.createElement("div");
  item.className = "list-item";
  item.innerHTML = `
    <div>
      <div><strong>${alertForLang.title}</strong></div>
      <div class="meta">${new Date(communication.timestamp).toLocaleTimeString()}</div>
    </div>
    <span class="badge badge-active">${communication.incidentId || ""}</span>
  `;
  if (historyEl.querySelector("p")) historyEl.innerHTML = "";
  historyEl.prepend(item);
}

document.getElementById("langSelect").addEventListener("change", (e) => {
  currentLang = e.target.value;
  document.getElementById("checkinBtn").textContent = t("checkinBtn");
  document.getElementById("checkinConfirm").textContent = t("checkinConfirm");
  renderShelters(sheltersData);
  if (lastCommunication) showAlert(lastCommunication);
});

document.getElementById("checkinBtn").addEventListener("click", async () => {
  const name = document.getElementById("citizenName").value || "Anonymous";
  let coords = {};
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 })
      );
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      /* location optional */
    }
  }
  const res = await fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ...coords })
  });
  const data = await res.json();
  document.getElementById("checkinConfirm").style.display = "block";
  document.getElementById("checkinCount").textContent = data.total;
});

socket.on("state:init", (state) => {
  renderShelters(state.shelters);
  document.getElementById("checkinCount").textContent = state.checkInCount || 0;
  if (state.activeAlerts && state.activeAlerts.length) {
    showAlert({ alerts: state.activeAlerts, timestamp: new Date().toISOString() });
  }
});

socket.on("resources:update", (data) => {
  renderShelters(data.shelters);
});

socket.on("citizen:alert", (communication) => {
  showAlert(communication);
});

socket.on("checkin:count", (data) => {
  document.getElementById("checkinCount").textContent = data.count;
});

socket.on("state:reset", () => {
  document.getElementById("alertBanner").classList.remove("show");
  document.getElementById("alertHistory").innerHTML = `<p style="color:var(--muted); font-size:13px;">${t("noAlerts")}</p>`;
  document.getElementById("checkinCount").textContent = 0;
});

initMap();

fetch("/api/state")
  .then((r) => r.json())
  .then((state) => {
    renderShelters(state.shelters);
    document.getElementById("checkinCount").textContent = state.checkIns.length;
    if (state.activeAlerts && state.activeAlerts.length) {
      showAlert({ alerts: state.activeAlerts, timestamp: new Date().toISOString() });
    }
  });
