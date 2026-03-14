const express = require("express");
const router = express.Router();
const Mood = require("../models/mood");
const authMiddleware = require("../middleware/authMiddleware");


// ✅ Add Mood
router.post("/add", authMiddleware, async (req, res) => {

    try {

        const { mood, sleepHours, stressLevel, focusLevel } = req.body;

        // Basic Risk Score Logic
        let riskScore = 0;

        if (sleepHours < 6) riskScore += 25;
        if (stressLevel > 7) riskScore += 30;
        if (focusLevel < 5) riskScore += 20;
        if (mood.toLowerCase() === "sad" || mood.toLowerCase() === "angry") {
            riskScore += 25;
        }

        let riskLevel = "Low";

        if (riskScore >= 60) riskLevel = "High";
        else if (riskScore >= 30) riskLevel = "Medium";

        let recommendation = "";

if (riskLevel === "High") {
    recommendation = "Consider talking to a counselor and taking immediate stress relief steps.";
} 
else if (riskLevel === "Medium") {
    recommendation = "Try meditation, exercise, and better sleep scheduling.";
} 
else {
    recommendation = "Great! Maintain your healthy routine.";
}

        const moodEntry = new Mood({
            userId: req.user.id,
            mood,
            sleepHours,
            stressLevel,
            focusLevel,
            riskLevel
        });

        await moodEntry.save();

        res.status(201).json({
            message: "Mood saved successfully ✅",
            riskScore,
            riskLevel,
            recommendation
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// GET USER MOOD HISTORY
router.get("/history", authMiddleware, async (req, res) => {

    try {

        const moods = await Mood.find({ userId: req.user.id }).sort({ date: -1 });

        res.json(moods);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});



// ✅ Get My Moods
router.get("/my-moods", authMiddleware, async (req, res) => {

    try {

        const moods = await Mood.find({
            userId: req.user.id
        });

        res.json(moods);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }
});

module.exports = router;

