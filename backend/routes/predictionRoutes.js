const express = require("express");
const router = express.Router();
const { predictMentalHealth } = require("../controllers/predictionController");

router.post("/predict", predictMentalHealth);

module.exports = router;