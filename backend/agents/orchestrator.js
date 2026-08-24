/**
 * Orchestration Layer
 * The shared "live situational picture" that every agent reads from and
 * writes to. Runs the Detection -> Coordination -> Communication ->
 * Resource -> Assessment pipeline for the demo flash-flood walkthrough,
 * emitting each step over Socket.IO as it completes (mirrors the
 * LangGraph message-bus concept from the architecture slide).
 */

const detectionAgent = require("./detectionAgent");
const coordinationAgent = require("./coordinationAgent");
const communicationAgent = require("./communicationAgent");
const resourceAgent = require("./resourceAgent");
const assessmentAgent = require("./assessmentAgent");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Orchestrator {
  constructor(io, state) {
    this.io = io;
    this.state = state; // shared in-memory situational picture
    this.running = false;
  }

  emit(event, payload) {
    this.io.emit(event, payload);
  }

  async runFlashFloodScenario({ rainfallSurgeMm = 90 } = {}) {
    if (this.running) {
      return { started: false, reason: "A simulation is already running." };
    }
    this.running = true;
    this.emit("scenario:start", {
      name: "Flash Flood — Central India District",
      timestamp: new Date().toISOString()
    });

    // Step 1: Detection
    this.emit("agent:status", { agent: "Detection Agent", status: "active" });
    await sleep(1200);
    const detection = detectionAgent.evaluateFloodRisk(
      this.state.sensors,
      rainfallSurgeMm
    );
    this.state.log.push(detection);
    this.emit("agent:result", detection);
    this.emit("agent:status", {
      agent: "Detection Agent",
      status: detection.hazardDetected ? "complete" : "idle"
    });

    if (!detection.hazardDetected) {
      this.running = false;
      this.emit("scenario:end", { hazardDetected: false });
      return { started: true, hazardDetected: false };
    }

    // Step 2: Coordination
    this.emit("agent:status", { agent: "Coordination Agent", status: "active" });
    await sleep(1000);
    const coordination = coordinationAgent.verifyAndEscalate(detection);
    this.state.log.push(coordination);
    this.state.activeIncidentId = coordination.incidentId;
    this.emit("agent:result", coordination);
    this.emit("agent:status", { agent: "Coordination Agent", status: "complete" });

    // Step 3: Communication
    this.emit("agent:status", { agent: "Communication Agent", status: "active" });
    await sleep(1000);
    const communication = communicationAgent.composeAlerts(
      coordination,
      detection.district
    );
    this.state.log.push(communication);
    this.state.activeAlerts = communication.alerts;
    this.emit("agent:result", communication);
    this.emit("citizen:alert", communication);
    this.emit("agent:status", { agent: "Communication Agent", status: "complete" });

    // Step 4: Resource matching + dispatch
    this.emit("agent:status", { agent: "Resource Agent", status: "active" });
    await sleep(1200);
    const hazardOrigin = detection.triggeredSensors[0] || this.state.sensors.riverSensors[0];
    const resource = resourceAgent.matchResources(
      coordination,
      hazardOrigin,
      this.state.shelters,
      this.state.reliefTeams
    );
    // Apply dispatch to shared state
    resource.dispatches.forEach((d) => {
      const team = this.state.reliefTeams.find((t) => t.id === d.teamId);
      if (team) {
        team.status = "dispatched";
        team.assignedShelterId = d.shelterId;
      }
    });
    this.state.log.push(resource);
    this.emit("agent:result", resource);
    this.emit("resources:update", {
      shelters: this.state.shelters,
      reliefTeams: this.state.reliefTeams
    });
    this.emit("agent:status", { agent: "Resource Agent", status: "complete" });

    // Step 5: Assessment (simulated post-event)
    this.emit("agent:status", { agent: "Assessment Agent", status: "active" });
    await sleep(1400);
    const assessment = assessmentAgent.assessDamage(
      coordination,
      detection.triggeredSensors
    );
    this.state.log.push(assessment);
    this.emit("agent:result", assessment);
    this.emit("agent:status", { agent: "Assessment Agent", status: "complete" });

    this.emit("scenario:end", {
      hazardDetected: true,
      incidentId: coordination.incidentId
    });
    this.running = false;

    return {
      started: true,
      hazardDetected: true,
      incidentId: coordination.incidentId,
      detection,
      coordination,
      communication,
      resource,
      assessment
    };
  }
}

module.exports = Orchestrator;
