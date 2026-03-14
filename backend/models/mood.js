const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  Gender: String,
  Country: String,
  Occupation: String,
  self_employed: String,
  family_history: String,
  treatment: String,

  Days_Indoors: String,
  Growing_Stress: String,
  Changes_Habits: String,
  Mental_Health_History: String,
  Mood_Swings: String,
  Coping_Struggles: String,

  Work_Interest: String,
  Social_Weakness: String,
  mental_health_interview: String,
  care_options: String,

  mental_score: {
    type: Number
  },

  risk_level: {
    type: String
  },

  confidence: {
    type: Number
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Mood", moodSchema);