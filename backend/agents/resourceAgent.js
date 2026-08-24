/**
 * Resource Agent
 * Tracks shelters, medical stock and relief-team location on a live map,
 * and auto-dispatches the nearest available team(s) to the nearest open
 * shelters with capacity.
 */

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function matchResources(coordinationResult, hazardOrigin, shelters, teams) {
  if (!coordinationResult.verified) {
    return {
      agent: "Resource Agent",
      dispatched: false,
      timestamp: new Date().toISOString()
    };
  }

  const rankedShelters = [...shelters]
    .filter((s) => s.status === "open" && s.occupied < s.capacity)
    .map((s) => ({ ...s, distanceKm: +haversineKm(hazardOrigin, s).toFixed(2) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  const availableTeams = teams.filter((t) => t.status === "available");
  const dispatches = [];

  rankedShelters.forEach((shelter, i) => {
    const team = availableTeams[i];
    if (team) {
      dispatches.push({
        teamId: team.id,
        teamName: team.name,
        teamType: team.type,
        shelterId: shelter.id,
        shelterName: shelter.name,
        distanceKm: +haversineKm(team, shelter).toFixed(2)
      });
    }
  });

  return {
    agent: "Resource Agent",
    dispatched: true,
    incidentId: coordinationResult.incidentId,
    recommendedShelters: rankedShelters,
    dispatches,
    timestamp: new Date().toISOString()
  };
}

module.exports = { matchResources, haversineKm };
