const { spawn } = require("child_process");
const path = require("path");
const Mood = require("../models/mood_model");

exports.predictMentalHealth = async (req, res) => {
  try {
    console.log("Incoming Data:", req.body);

    const inputData = req.body;

    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    const pythonProcess = spawn(pythonCommand, [
      path.join(__dirname, "../../ai/predict.py"),
      JSON.stringify(inputData)
    ]);

    let result = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", async (code) => {
      if (code !== 0 && !result) {
        console.error("Python Error:", errorOutput);
        return res.status(500).json({ error: errorOutput || "Python process failed" });
      }

      if (!result) {
        return res.status(500).json({ error: "No response from AI model" });
      }

      let prediction;

      try {
        prediction = JSON.parse(result.trim());
      } catch (err) {
        console.error("JSON Parse Error:", err);
        return res.status(500).json({ error: "Invalid JSON from AI model" });
      }

      // SAVE TO DATABASE
      const moodEntry = new Mood({
        userId: req.user?.id || null,

        Gender: inputData.Gender,
        Country: inputData.Country,
        Occupation: inputData.Occupation,
        self_employed: inputData.self_employed,
        family_history: inputData.family_history,
        treatment: inputData.treatment,

        Days_Indoors: inputData.Days_Indoors,
        Growing_Stress: inputData.Growing_Stress,
        Changes_Habits: inputData.Changes_Habits,
        Mental_Health_History: inputData.Mental_Health_History,
        Mood_Swings: inputData.Mood_Swings,
        Coping_Struggles: inputData.Coping_Struggles,

        Work_Interest: inputData.Work_Interest,
        Social_Weakness: inputData.Social_Weakness,
        mental_health_interview: inputData.mental_health_interview,
        care_options: inputData.care_options,

        mental_score: prediction.mental_score,
        risk_level: prediction.risk_level,
        confidence: prediction.confidence
      });

      await moodEntry.save();

      // ----------------------------
      // TREND DETECTION
      // ----------------------------

      const recentEntries = await Mood.find({
        userId: req.user?.id
      })
        .sort({ createdAt: -1 })
        .limit(5);

      const scores = recentEntries.map(e => e.mental_score).reverse();

      let trend = "Stable";

      if (scores.length >= 3) {
        const first = scores[0];
        const last = scores[scores.length - 1];

        if (last < first - 10) trend = "Declining";
        else if (last > first + 10) trend = "Improving";
      }

      // ✅ FIX IS HERE (Object wrapped properly)
      return res.json({
        success: true,
        prediction,
        trend,
        recent_scores: scores
      });
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
};