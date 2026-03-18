const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { predictMentalHealth } = require("../controllers/predictionController");

// Prediction route — auth required
router.post("/", authMiddleware, predictMentalHealth);

module.exports = router;
