const socket = io();

let map;
let sensorLayer, shelterLayer, teamLayer;

function initMap() {
  map = L.map("admin-map").setView([23.2599, 77.4126], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18
  }).addTo(map);
  sensorLayer = L.layerGroup().addTo(map);
  shelterLayer = L.layerGroup().addTo(map);
  teamLayer = L.layerGroup().addTo(map);
}

function renderSensors(sensors) {
  sensorLayer.clearLayers();
  sensors.riverSensors.forEach((s) => {
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 8,
      color: "#1e6fd9",
      fillColor: "#1e6fd9",
      fillOpacity: 0.8
    }).addTo(sensorLayer);
    marker.bindPopup(
      `<strong>${s.name}</strong><br/>Level: ${s.currentLevelM}m (danger: ${s.dangerLevelM}m)`
    );
  });
}

function renderShelters(shelters) {
  shelterLayer.clearLayers();
  const tbody = document.getElementById("shelterTable");
  tbody.innerHTML = "";
  let openCount = 0;

  shelters.forEach((s) => {
    const isFull = s.occupied >= s.capacity;
    if (s.status === "open" && !isFull) openCount++;
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 9,
      color: isFull ? "#d7263d" : "#1b998b",
      fillColor: isFull ? "#d7263d" : "#1b998b",
      fillOpacity: 0.85,
      weight: 2
    }).addTo(shelterLayer);
    marker.bindPopup(`<strong>${s.name}</strong><br/>${s.occupied}/${s.capacity} occupied`);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.occupied}/${s.capacity}</td>
      <td>${s.medicalStock}</td>
      <td><span class="badge ${isFull ? "badge-full" : "badge-open"}">${isFull ? "Full" : "Open"}</span></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("statShelters").textContent = openCount;
}

function renderTeams(teams, shelters) {
  teamLayer.clearLayers();
  const tbody = document.getElementById("teamTable");
  tbody.innerHTML = "";
  let availableCount = 0;

  teams.forEach((team) => {
    if (team.status === "available") availableCount++;
    const marker = L.circleMarker([team.lat, team.lng], {
      radius: 7,
      color: team.status === "dispatched" ? "#d7263d" : "#f2a541",
      fillColor: team.status === "dispatched" ? "#d7263d" : "#f2a541",
      fillOpacity: 0.85
    }).addTo(teamLayer);
    marker.bindPopup(`<strong>${team.name}</strong><br/>${team.type}<br/>Status: ${team.status}`);

    const shelter = shelters.find((s) => s.id === team.assignedShelterId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${team.name}</td>
      <td>${team.type}</td>
      <td><span class="badge ${team.status === "dispatched" ? "badge-dispatched" : "badge-available"}">${team.status}</span></td>
      <td>${shelter ? shelter.name : "—"}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("statTeams").textContent = availableCount;
}

function setAgentStatus(agentName, status) {
  const card = document.querySelector(`.agent-card[data-agent="${agentName}"]`);
  if (!card) return;
  card.classList.remove("active", "complete");
  if (status === "active") card.classList.add("active");
  if (status === "complete") card.classList.add("complete");
  const badge = card.querySelector("[data-status]");
  badge.className = `badge badge-${status}`;
  badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

function resetAgentStatuses() {
  ["Detection Agent", "Coordination Agent", "Communication Agent", "Resource Agent", "Assessment Agent"]
    .forEach((a) => setAgentStatus(a, "idle"));
}

function addLogEntry(result) {
  const feed = document.getElementById("logFeed");
  if (feed.querySelector("p")) feed.innerHTML = "";

  const entry = document.createElement("div");
  entry.className = "log-entry";

  let detail = "";
  if (result.agent === "Detection Agent") {
    detail = result.hazardDetected
      ? `Hazard detected: ${result.hazardType} in ${result.district}. ${result.triggeredSensors.length} sensor(s) breached threshold. Confidence ${(result.confidence * 100).toFixed(0)}%.`
      : "No hazard detected from current sensor/weather fusion.";
  } else if (result.agent === "Coordination Agent") {
    detail = result.verified
      ? `Verified. Severity: ${result.severity.toUpperCase()}. Escalated to ${result.escalatedTo.join(", ")}. Incident ${result.incidentId}.`
      : "Nothing to verify.";
  } else if (result.agent === "Communication Agent") {
    detail = result.sent
      ? `Alerts sent via ${result.channels.join(", ")} in ${result.alerts.length} languages for incident ${result.incidentId}.`
      : "No alert sent.";
  } else if (result.agent === "Resource Agent") {
    detail = result.dispatched
      ? `Dispatched ${result.dispatches.length} team(s) to nearest shelters. Top match: ${result.recommendedShelters[0]?.name || "—"}.`
      : "No dispatch performed.";
  } else if (result.agent === "Assessment Agent") {
    detail = result.assessed
      ? `Damage score ${result.damageScore}/100. Relief-fund priority: ${result.reliefFundPriority}. Est. affected households: ${result.estimatedAffectedHouseholds}.`
      : "No assessment performed.";
  }

  entry.innerHTML = `
    <div class="agent-name">${result.agent}</div>
    <div>${detail}</div>
    <div class="ts">${new Date(result.timestamp).toLocaleTimeString()}</div>
  `;
  feed.prepend(entry);
}

document.getElementById("simulateBtn").addEventListener("click", async () => {
  document.getElementById("simulateBtn").disabled = true;
  resetAgentStatuses();
  await fetch("/api/simulate/flash-flood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rainfallSurgeMm: 90 })
  });
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  await fetch("/api/reset", { method: "POST" });
});

socket.on("state:init", (state) => {
  renderSensors(state.sensors);
  renderShelters(state.shelters);
  renderTeams(state.reliefTeams, state.shelters);
  document.getElementById("statCheckins").textContent = state.checkInCount || 0;
});

socket.on("agent:status", ({ agent, status }) => setAgentStatus(agent, status));
socket.on("agent:result", (result) => addLogEntry(result));

socket.on("resources:update", (data) => {
  renderShelters(data.shelters);
  renderTeams(data.reliefTeams, data.shelters);
});

socket.on("scenario:end", (data) => {
  document.getElementById("simulateBtn").disabled = false;
  if (data.incidentId) {
    document.getElementById("statIncident").textContent = data.incidentId;
  }
});

socket.on("checkin:count", (data) => {
  document.getElementById("statCheckins").textContent = data.count;
});

socket.on("state:reset", () => {
  resetAgentStatuses();
  document.getElementById("statIncident").textContent = "—";
  document.getElementById("statCheckins").textContent = "0";
  document.getElementById("logFeed").innerHTML =
    '<p style="color:var(--muted); font-size:13px;">No activity yet. Click "Simulate Flash Flood Scenario" to run the end-to-end walkthrough.</p>';
  fetch("/api/state").then((r) => r.json()).then((state) => {
    renderShelters(state.shelters);
    renderTeams(state.reliefTeams, state.shelters);
  });
});

initMap();

fetch("/api/state")
  .then((r) => r.json())
  .then((state) => {
    renderSensors(state.sensors);
    renderShelters(state.shelters);
    renderTeams(state.reliefTeams, state.shelters);
    document.getElementById("statCheckins").textContent = state.checkIns.length;
    if (state.activeIncidentId) {
      document.getElementById("statIncident").textContent = state.activeIncidentId;
    }
  });
