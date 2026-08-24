/**
 * Assessment Agent
 * Analyzes post-disaster drone/satellite imagery (simulated here with a
 * scored mock dataset) to speed damage assessment and relief-fund
 * prioritization once the immediate flood event has passed.
 */

function assessDamage(coordinationResult, triggeredSensors) {
  if (!coordinationResult.verified) {
    return {
      agent: "Assessment Agent",
      assessed: false,
      timestamp: new Date().toISOString()
    };
  }

  // Mock "computer vision" scoring: worse sensor breaches -> higher
  // estimated damage & higher relief-fund priority.
  const avgBreach =
    triggeredSensors.reduce(
      (sum, s) => sum + s.simulatedLevel / s.dangerLevelM,
      0
    ) / triggeredSensors.length;

  const damageScore = Math.min(100, Math.round(avgBreach * 60));
  let priority = "Low";
  if (damageScore >= 75) priority = "Critical";
  else if (damageScore >= 50) priority = "High";
  else if (damageScore >= 25) priority = "Medium";

  return {
    agent: "Assessment Agent",
    assessed: true,
    incidentId: coordinationResult.incidentId,
    source: "Simulated drone/satellite imagery scan",
    damageScore,
    reliefFundPriority: priority,
    estimatedAffectedHouseholds: Math.round(damageScore * 4.2),
    timestamp: new Date().toISOString()
  };
}

module.exports = { assessDamage };
