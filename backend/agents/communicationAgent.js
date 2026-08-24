/**
 * Communication Agent
 * Sends multilingual voice, SMS & app alerts with evacuation guidance
 * to citizens. This demo "sends" alerts over Socket.IO instead of a real
 * Twilio/IVR gateway, and returns pre-templated copy in three languages
 * so the offline/low-literacy use case in the deck is visible in the UI.
 */

const TEMPLATES = {
  en: {
    title: "FLASH FLOOD WARNING",
    body: (district) =>
      `Heavy rainfall has pushed river levels near ${district} above the danger mark. Move to higher ground or your nearest shelter immediately. Do not cross flooded roads or bridges.`
  },
  hi: {
    title: "बाढ़ की चेतावनी",
    body: (district) =>
      `${district} के पास भारी बारिश के कारण नदी का जलस्तर खतरे के निशान से ऊपर पहुंच गया है। तुरंत ऊंचे स्थान या नज़दीकी राहत शिविर की ओर जाएं। जलमग्न सड़कों या पुलों को पार न करें।`
  },
  mr: {
    title: "पूर इशारा",
    body: (district) =>
      `जोरदार पावसामुळे ${district} जवळील नदीची पातळी धोक्याच्या पातळीपेक्षा वर गेली आहे. ताबडतोब उंच जागी किंवा जवळच्या निवारा केंद्रात जा. पाण्याखालील रस्ते किंवा पूल ओलांडू नका.`
  }
};

function composeAlerts(coordinationResult, district) {
  if (!coordinationResult.verified) {
    return {
      agent: "Communication Agent",
      sent: false,
      timestamp: new Date().toISOString()
    };
  }

  const alerts = Object.entries(TEMPLATES).map(([lang, t]) => ({
    lang,
    title: t.title,
    body: t.body(district)
  }));

  return {
    agent: "Communication Agent",
    sent: true,
    channels: ["Voice (IVR)", "SMS", "Mobile App Push"],
    incidentId: coordinationResult.incidentId,
    alerts,
    timestamp: new Date().toISOString()
  };
}

module.exports = { composeAlerts };
