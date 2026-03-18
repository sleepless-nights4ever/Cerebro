const mongoose = require("mongoose");

const therapistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  alias: { type: String },           // anonymous display name e.g. "Dr. A"
  specializations: [String],         // e.g. ["anxiety", "depression", "stress"]
  languages: [String],
  available: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  bio: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Therapist", therapistSchema);
