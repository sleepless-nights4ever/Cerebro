const https = require("https");

// ── Gemini API call
function callGemini(apiKey, systemPrompt, messages, generationOptions = {}) {
  return new Promise((resolve, reject) => {
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const payload = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 300, temperature: 0.8, ...generationOptions }
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: "/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { reject(new Error("Invalid JSON from Gemini")); }
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error("Gemini request timed out")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { callGemini };
