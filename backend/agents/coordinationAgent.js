/**
 * Coordination Agent
 * Verifies the Detection Agent's signal, computes severity, and escalates
 * to the district control room dashboard. Matches available resources to
 * real-time need and optimizes dispatch priority.
 */

function verifyAndEscalate(detectionResult) {
  if (!detectionResult.hazardDetected) {
    return {
      agent: "Coordination Agent",
      verified: false,
      message: "No hazard signal to verify.",
      timestamp: new Date().toISOString()
    };
  }

  const maxBreach = Math.max(
    ...detectionResult.triggeredSensors.map(
      (s) => s.simulatedLevel / s.dangerLevelM
    )
  );

  let severity = "watch";
  if (maxBreach >= 1.15) severity = "critical";
  else if (maxBreach >= 1.0) severity = "warning";
  else severity = "watch";

  return {
    agent: "Coordination Agent",
    verified: true,
    severity,
    escalatedTo: [
      "District Control Room",
      "District Collector Dashboard",
      "State Disaster Management Authority"
    ],
    confidence: detectionResult.confidence,
    incidentId: `INC-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString()
  };
}

module.exports = { verifyAndEscalate };
