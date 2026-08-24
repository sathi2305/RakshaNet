/**
 * Detection Agent
 * Fuses IoT river-gauge data, IMD/CWC weather forecasts and (in a full build)
 * social-signal reports to spot hazards early.
 *
 * This demo simulates a flash-flood scenario: a rain surge pushes a river
 * sensor above its danger level, and the agent raises a hazard event.
 */

function evaluateFloodRisk(sensors, rainfallSurgeMm) {
  const forecast = {
    ...sensors.weatherForecast,
    next6hRainfallMm: sensors.weatherForecast.next6hRainfallMm + rainfallSurgeMm
  };

  const triggeredSensors = sensors.riverSensors
    .map((s) => {
      // Simulate a rise in level proportional to the rainfall surge
      const simulatedLevel = +(s.currentLevelM + rainfallSurgeMm / 25).toFixed(2);
      return { ...s, simulatedLevel };
    })
    .filter((s) => s.simulatedLevel >= s.dangerLevelM * 0.85);

  const heavyRain = forecast.next6hRainfallMm >= forecast.heavyRainThresholdMm * 0.6;

  const hazardDetected = triggeredSensors.length > 0 && heavyRain;

  return {
    agent: "Detection Agent",
    hazardDetected,
    hazardType: hazardDetected ? "flash_flood" : null,
    district: sensors.district,
    triggeredSensors,
    forecast,
    confidence: hazardDetected
      ? Math.min(0.99, 0.6 + triggeredSensors.length * 0.15)
      : 0,
    timestamp: new Date().toISOString()
  };
}

module.exports = { evaluateFloodRisk };
