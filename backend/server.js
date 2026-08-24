const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const shelters = require("./data/shelters.json");
const reliefTeams = require("./data/reliefTeams.json");
const sensors = require("./data/sensors.json");

const Orchestrator = require("./agents/orchestrator");
const buildApiRouter = require("./routes/api");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Shared in-memory "situational picture" (in a full build this lives in
// PostgreSQL/PostGIS + Redis, per the architecture slide).
const state = {
  shelters,
  reliefTeams,
  sensors,
  log: [],
  activeIncidentId: null,
  activeAlerts: [],
  checkIns: []
};

const orchestrator = new Orchestrator(io, state);

app.use("/api", buildApiRouter(state, orchestrator, io));

// Serve the frontend (citizen app + admin dashboard)
app.use(express.static(path.join(__dirname, "..", "frontend")));

io.on("connection", (socket) => {
  socket.emit("state:init", {
    shelters: state.shelters,
    reliefTeams: state.reliefTeams,
    sensors: state.sensors,
    activeAlerts: state.activeAlerts,
    checkInCount: state.checkIns.length
  });
});

server.listen(PORT, () => {
  console.log(`RakshaNet server running at http://localhost:${PORT}`);
  console.log(`  Citizen app:      http://localhost:${PORT}/index.html`);
  console.log(`  Admin dashboard:  http://localhost:${PORT}/dashboard.html`);
});
