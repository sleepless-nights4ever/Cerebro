const mongoose = require("mongoose");

const therapistRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist" },
  stressScore: { type: Number },
  riskLevel: { type: String },
  message: { type: String },
  status: {
    type: String,
    enum: ["pending", "matched", "active", "completed"],
    default: "pending"
  },
  anonymousUserId: { type: String },  // hashed user id for anonymity
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TherapistRequest", therapistRequestSchema);
