const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const authMiddleware = require("../middleware/authMiddleware");
const Therapist = require("../models/therapist_model");
const TherapistRequest = require("../models/therapistRequest_model");
const Mood = require("../models/mood_model");

// ── GET /api/therapists — List available therapists (anonymous view)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const therapists = await Therapist.find({ available: true })
      .select("alias specializations languages rating bio available");
    res.json(therapists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/therapists/request — Request anonymous therapist connection
router.post("/request", authMiddleware, async (req, res) => {
  try {
    const { message, therapistId } = req.body;

    // Get latest risk level
    const latest = await Mood.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    const stressScore = latest?.stressLevel || null;
    const riskLevel = latest?.risk_level || latest?.riskLevel || "Unknown";

    // Create anonymous ID (hashed user id — no real identity stored)
    const anonymousId = crypto.createHash("sha256")
      .update(req.user.id + (process.env.ANON_SALT || "cerebro_salt"))
      .digest("hex")
      .substring(0, 12);

    // Auto-match to least-busy available therapist if none specified
    let matchedTherapist = therapistId
      ? await Therapist.findById(therapistId)
      : await Therapist.findOne({ available: true }).sort({ totalSessions: 1 });

    const request = new TherapistRequest({
      userId: req.user.id,
      therapistId: matchedTherapist?._id || null,
      stressScore,
      riskLevel,
      message,
      anonymousUserId: anonymousId,
      status: matchedTherapist ? "matched" : "pending"
    });
    await request.save();

    res.status(201).json({
      message: "Connection request submitted ✅",
      anonymousId,
      matchedWith: matchedTherapist ? matchedTherapist.alias : "Searching for a match...",
      status: request.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/therapists/my-requests — User's own requests (anonymous)
router.get("/my-requests", authMiddleware, async (req, res) => {
  try {
    const requests = await TherapistRequest.find({ userId: req.user.id })
      .populate("therapistId", "alias specializations rating")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/therapists/seed — Seed sample therapists (dev only)
router.post("/seed", async (req, res) => {
  try {
    await Therapist.deleteMany({});
    const sample = [
      { name: "Dr. Priya Sharma", alias: "Dr. P", specializations: ["anxiety", "depression", "stress"], languages: ["English", "Hindi"], bio: "10+ years in cognitive behavioral therapy.", rating: 4.8 },
      { name: "Dr. Arjun Mehta", alias: "Dr. A", specializations: ["trauma", "work-stress", "relationships"], languages: ["English", "Hindi", "Marathi"], bio: "Specialist in workplace mental health.", rating: 4.7 },
      { name: "Dr. Sara Nair", alias: "Dr. S", specializations: ["depression", "anxiety", "self-esteem"], languages: ["English", "Malayalam"], bio: "Compassionate listener with mindfulness approach.", rating: 4.9 }
    ];
    await Therapist.insertMany(sample);
    res.json({ message: "Therapists seeded ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
