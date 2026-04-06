const express = require("express");
const router = express.Router();
const Mood = require("../models/mood_model");
const authMiddleware = require("../middleware/authMiddleware");

// ── POST /api/moods/add — Daily mood tracker entry
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { mood, sleepHours, stressLevel, focusLevel, journalNote } = req.body;

    let riskScore = 0;
    if (sleepHours < 6) riskScore += 25;
    if (stressLevel > 7) riskScore += 30;
    if (focusLevel < 5) riskScore += 20;
    if (["sad", "angry", "anxious"].includes(mood?.toLowerCase())) riskScore += 25;

    let riskLevel = "Low";
    if (riskScore >= 60) riskLevel = "High";
    else if (riskScore >= 30) riskLevel = "Medium";

    const recommendations = {
      High: "Consider talking to a counselor. Immediate stress relief steps are recommended.",
      Medium: "Try meditation, exercise, and better sleep scheduling.",
      Low: "Great! Maintain your healthy routine."
    };

    const moodEntry = new Mood({
      userId: req.user.id,
      mood, sleepHours, stressLevel, focusLevel,
      journalNote, risk_level: riskLevel,
      mental_score: 100 - riskScore,
      entryType: "daily"
    });
    await moodEntry.save();

    res.status(201).json({
      message: "Mood saved ✅",
      riskScore, riskLevel,
      recommendation: recommendations[riskLevel]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/moods/history — All mood history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const moods = await Mood.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(moods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/moods/analysis — Weekly analysis
router.get("/analysis", authMiddleware, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const entries = await Mood.find({
      userId: req.user.id,
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: 1 });

    if (entries.length === 0) {
      return res.json({ message: "No data for the past 7 days.", entries: [] });
    }

    // Aggregate stats
    const dailyEntries = entries.filter(e => e.entryType === "daily");
    const avgStress = dailyEntries.length
      ? (dailyEntries.reduce((s, e) => s + (e.stressLevel || 0), 0) / dailyEntries.length).toFixed(1)
      : 0;
    const avgSleep = dailyEntries.length
      ? (dailyEntries.reduce((s, e) => s + (e.sleepHours || 0), 0) / dailyEntries.length).toFixed(1)
      : 0;
    const avgScore = entries.length
      ? Math.round(entries.reduce((s, e) => s + (e.mental_score || 0), 0) / entries.length)
      : 0;

    const moodCounts = {};
    dailyEntries.forEach(e => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    const scores = entries.map(e => e.mental_score || 0);
    let trend = "Stable";
    if (scores.length >= 3) {
      const first = scores.slice(0, Math.floor(scores.length / 2));
      const last = scores.slice(Math.floor(scores.length / 2));
      const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
      const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
      if (lastAvg < firstAvg - 8) trend = "Declining";
      else if (lastAvg > firstAvg + 8) trend = "Improving";
    }

    res.json({
      period: "Last 7 days",
      totalEntries: entries.length,
      avgStressLevel: Number(avgStress),
      avgSleepHours: Number(avgSleep),
      avgMentalScore: avgScore,
      moodDistribution: moodCounts,
      trend,
      entries: entries.slice(-7).map(e => ({
        date: e.createdAt,
        mood: e.mood,
        stressLevel: e.stressLevel,
        sleepHours: e.sleepHours,
        mental_score: e.mental_score,
        riskLevel: e.risk_level || e.riskLevel
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
