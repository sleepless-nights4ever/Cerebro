const express = require("express");
const router = express.Router();
const https = require("https");
const authMiddleware = require("../middleware/authMiddleware");
const Mood = require("../models/mood_model");
const { retrieveWellnessGuidance } = require("../services/wellnessKnowledge");

// ── Gemini API call
function callGemini(apiKey, systemPrompt, messages) {
  return new Promise((resolve, reject) => {
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const payload = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 300, temperature: 0.8 }
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error("Invalid JSON from Gemini: " + data)); }
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error("Gemini request timed out")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Rule-based fallback responses
const responses = {
  greeting: [
    "Hi! I'm Cerebro, your mental wellness companion. How are you feeling today?",
    "Hello! I'm here to support you. What's on your mind?",
    "Hey there! How are you doing today?"
  ],
  sad: [
    "I'm sorry you're feeling sad. It's okay to feel this way — your emotions are valid. Would you like to talk about what's been going on?",
    "Sadness can be really heavy to carry. You don't have to go through it alone. What's been weighing on you?",
    "I hear you. If this feeling has been lasting a while, speaking with a counselor can really help. Would that be something you'd consider?",
    "Thank you for sharing that with me. Sometimes just talking about it helps. What do you think triggered this feeling?"
  ],
  anxious: [
    "Anxiety can feel overwhelming, but you're not alone. Try taking 5 slow deep breaths — it genuinely helps calm your nervous system.",
    "I understand anxiety can be really difficult. The 5-4-3-2-1 grounding technique can help: name 5 things you see, 4 you hear, 3 you can touch...",
    "When anxiety hits, focus on what's in your control right now. What's one small thing you can do to feel safer?",
    "It's okay to feel anxious. Try breathing in for 4 counts, hold for 4, out for 6. Repeat 3 times."
  ],
  stressed: [
    "Stress can really build up. Have you had any time for yourself lately — even just 10 minutes?",
    "When stress feels overwhelming, breaking tasks into smaller pieces can help. What's stressing you out the most right now?",
    "High stress over time affects your health. Regular sleep, exercise, and talking to someone you trust can make a big difference.",
    "It sounds like you have a lot on your plate. Remember — it's okay to ask for help and set boundaries."
  ],
  angry: [
    "Anger is a valid emotion. Before acting on it, try stepping away for a few minutes to let the intensity pass.",
    "I hear that you're feeling angry. What happened? Talking it through can help process the feeling.",
    "When anger takes over, physical movement like a short walk can help release that tension.",
    "It's okay to be angry. Try to identify what specifically triggered it — that can help address the root cause."
  ],
  lonely: [
    "Loneliness is more common than people think, and it's tough. Reaching out — even to one person — can make a big difference.",
    "I'm glad you're talking to me. Feeling lonely doesn't mean you're alone forever. Small connections, even brief ones, help.",
    "Have you considered joining a group around something you enjoy? It's a gentle way to build connections.",
    "You matter, and your feelings matter. If loneliness persists, speaking with a therapist can provide real support."
  ],
  tired: [
    "Exhaustion affects everything — mood, focus, motivation. How has your sleep been lately?",
    "Mental fatigue is real. Make sure you're getting 7-8 hours of sleep and taking breaks during the day.",
    "Sometimes tiredness is your body asking you to slow down. What does rest look like for you?",
    "If you're tired despite sleeping enough, it might be worth checking in with a doctor — it can be linked to mental health too."
  ],
  happy: [
    "That's wonderful to hear! What's been making you feel good lately?",
    "I love hearing that! Keep doing whatever is working for you — positive moments are worth celebrating.",
    "Great! Positive emotions are worth noting. What contributed to this feeling?",
    "That's really great! How can you carry this energy into the rest of your week?"
  ],
  help: [
    "I'm here for you. You can talk to me about how you're feeling, your stress, sleep, or anything on your mind.",
    "Of course! I can help you reflect on your mood, suggest coping strategies, or just be a supportive ear.",
    "You can share anything with me — I won't judge. What would you like help with today?"
  ],
  default: [
    "Thank you for sharing that with me. Can you tell me more about how you've been feeling?",
    "I hear you. It sounds like things have been difficult. What's been the hardest part?",
    "I'm here to listen. How long have you been feeling this way?",
    "That sounds really tough. Have you been able to talk to anyone else about this?",
    "Your feelings are valid. What would feel most helpful right now — advice, just talking, or something else?"
  ]
};

function detectIntent(message) {
  const msg = message.toLowerCase();
  if (/suicid|kill myself|end my life|don't want to live|want to die/.test(msg)) return "crisis";
  if (/^(hi|hello|hey|good morning|good evening|howdy|sup)\b/.test(msg)) return "greeting";
  if (/sad|depress|cry|crying|hopeless|empty|numb|miserable|worthless/.test(msg)) return "sad";
  if (/anxi|panic|worry|worried|nervous|scared|fear|overwhelm/.test(msg)) return "anxious";
  if (/stress|pressure|burden|too much|can't cope|burnout/.test(msg)) return "stressed";
  if (/angry|anger|furious|mad|frustrated|irritat/.test(msg)) return "angry";
  if (/lone|lonely|alone|isolated|no friends|no one/.test(msg)) return "lonely";
  if (/tired|exhaust|fatigue|no energy|drained|sleepy|can't sleep|insomnia/.test(msg)) return "tired";
  if (/happy|good|great|amazing|wonderful|excited|joy|grateful/.test(msg)) return "happy";
  if (/help|support|what can you|how does this|what should/.test(msg)) return "help";
  return "default";
}

function getRuleBasedResponse(intent, history) {
  const pool = responses[intent] || responses.default;
  const lastReply = history.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";
  const available = pool.filter(r => r !== lastReply);
  const choices = available.length > 0 ? available : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

// ── POST /api/chat
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (typeof message !== "string" || !message.trim() || message.length > 4000 ||
        !Array.isArray(history)) {
      return res.status(400).json({ error: "Enter a message of 1 to 4000 characters and supply history as an array." });
    }

    const intent = detectIntent(message);
    if (intent === "crisis") {
      return res.json({
        reply: "I’m concerned about your safety. If you might hurt yourself soon or have already taken something or injured yourself, contact local emergency services now. If you can, tell someone you trust what’s happening and ask them to stay with you.",
        sources: []
      });
    }

    const previousMessages = history.slice(-10).filter(item =>
      item && ["user", "assistant"].includes(item.role) &&
      typeof item.content === "string" && item.content.trim() && item.content.length <= 4000
    ).map(({ role, content }) => ({ role, content }));
    const latest = await Mood.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    const stressScore = latest?.stressLevel ?? null;
    const riskLevel = latest?.risk_level ?? null;
    const mentalScore = latest?.mental_score ?? null;
    const guidance = retrieveWellnessGuidance(message);
    const sources = guidance.map(({ title, url }) => ({ title, url }));
    const apiKey = process.env.GEMINI_API_KEY;
    let reply;

    if (apiKey && guidance.length) {
      const notes = guidance.map(({ title, summary }) => title + "\n" + summary).join("\n\n");
      const systemPrompt = [
        "You are Cerebro, a supportive wellness chatbot. Respond in 2–4 sentences.",
        "Use the reference notes for any wellness suggestions. Do not invent sources or include URLs.",
        "Do not provide diagnoses, clinical risk estimates, treatment advice, or medication instructions.",
        "For possible immediate danger, encourage contacting local emergency services and a trusted person.",
        "The user's recent self-reported stress is " + (stressScore ?? "unavailable") + ".",
        "Reference notes:\n" + notes
      ].join("\n");
      try {
        const messages = [...previousMessages, { role: "user", content: message }];
        const { status, body } = await callGemini(apiKey, systemPrompt, messages);
        if (status === 200) {
          reply = body.candidates?.[0]?.content?.parts?.find(part => !part.thought)?.text?.trim();
        }
      } catch {
        console.warn("Gemini unavailable. Using local guidance.");
      }
    }

    if (!reply) {
      reply = guidance[0]?.summary || getRuleBasedResponse(intent, previousMessages);
    }

    res.json({ reply, sources, context: { stressScore, riskLevel, mentalScore } });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Chat is temporarily unavailable." });
  }
});

module.exports = router;
