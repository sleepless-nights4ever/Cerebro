const express = require("express");
const router = express.Router();
const https = require("https");
const authMiddleware = require("../middleware/authMiddleware");
const Mood = require("../models/mood_model");

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
  crisis: [
    "I'm really concerned about what you've shared. Please reach out right now — iCall: 9152987821 or Vandrevala Foundation: 1860-2662-345. You don't have to face this alone.",
    "What you're feeling sounds very serious. Please contact iCall at 9152987821 — they're available 24/7. You matter.",
    "Please reach out to a crisis helpline right now. iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345. Your life has value."
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
    const { message, history = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const latest = await Mood.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    const stressScore = latest?.stressLevel || 5;
    const riskLevel = latest?.risk_level || "Unknown";
    const mentalScore = latest?.mental_score || 70;

    let reply = null;

    // Try Gemini first if API key exists
    if (apiKey) {
      try {
        const systemPrompt = `You are Cerebro, a compassionate mental health support AI.
The user's mental wellness score is ${mentalScore}/100 and stress level is ${stressScore}/10.
Keep responses concise (2-4 sentences). Never diagnose. Suggest professional help for serious concerns.
If the user expresses suicidal thoughts, provide: iCall: 9152987821, Vandrevala Foundation: 1860-2662-345.
This is an ongoing conversation — do NOT repeat greetings or ask how the user feels if already asked.`;

        const previousMessages = (history || [])
          .slice(-10)
          .filter(m => m.role && m.content && ["user", "assistant"].includes(m.role));

        const messages = [...previousMessages, { role: "user", content: message }];

        const { status, body: data } = await callGemini(apiKey, systemPrompt, messages);
        console.log("Gemini status:", status);

        if (status === 200) {
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } else {
          console.log("Gemini unavailable, using rule-based fallback. Error:", data.error?.message);
        }
      } catch (geminiErr) {
        console.log("Gemini failed, using rule-based fallback:", geminiErr.message);
      }
    }

    // Fallback to rule-based if Gemini failed or no API key
    if (!reply) {
      const intent = detectIntent(message);
      reply = getRuleBasedResponse(intent, history);
      if ((stressScore >= 8 || riskLevel === "High Risk") && intent === "default") {
        reply = "I can see from your recent check-ins that you've been under a lot of stress. " + reply;
      }
      console.log(`Rule-based fallback | intent: ${intent}`);
    }

    res.json({ reply, context: { stressScore, riskLevel, mentalScore } });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
