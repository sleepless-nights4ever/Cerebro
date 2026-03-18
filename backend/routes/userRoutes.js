const authMiddleware = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY";

// REGISTER USER
router.post("/register", async (req, res) => {
  try {
    const { email, password, anonymous } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, anonymous });
    await newUser.save();
    res.status(201).json({ message: "User Registered Successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN USER
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ message: "Welcome to your dashboard 🔐", user: req.user });
});

module.exports = router;
