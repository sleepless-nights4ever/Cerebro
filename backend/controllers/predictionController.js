const { execFile } = require("child_process");
const { promisify } = require("util");
const runPython = promisify(execFile);
const path = require("path");
const Mood = require("../models/mood_model");

exports.predictMentalHealth = async (req, res) => {
  try {
    const inputData = req.body;
    const requiredFields = [
      "Gender", "Country", "Occupation", "self_employed", "treatment",
      "Days_Indoors", "Changes_Habits", "Work_Interest", "Social_Weakness",
      "mental_health_interview", "care_options"
    ];
    if (!inputData || requiredFields.some(field =>
      typeof inputData[field] !== "string" || !inputData[field].trim()
    )) {
      return res.status(400).json({ error: "Complete the assessment before submitting." });
    }

    const pythonCommand = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const { stdout } = await runPython(pythonCommand, [
      path.join(__dirname, "../../ai/predict.py"),
      JSON.stringify(inputData)
    ], { timeout: 15000 });
    const prediction = JSON.parse(stdout);

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

    return res.json({
      success: true,
      prediction,
      trend,
      recent_scores: scores
    });
  } catch (error) {
    console.error("Assessment failed:", error.code || error.name);
    return res.status(500).json({ error: "Assessment is temporarily unavailable." });
  }
};