const authMiddleware = require("../middleware/authMiddleware");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");



const express = require("express");
const router = express.Router();
const User = require("../models/user");

// REGISTER USER
router.post("/register", async (req, res) => {
    try {

        const { email, password, anonymous } = req.body;

       // hash password
const hashedPassword = await bcrypt.hash(password, 10);

const newUser = new User({
    email,
    password: hashedPassword,
    anonymous
});


        await newUser.save();

        res.status(201).json({
            message: "User Registered Successfully"
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// LOGIN USER
router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;

        // check if user exists
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        // compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

       // create token
const token = jwt.sign(
    { id: user._id },
    "SUPER_SECRET_KEY",
    { expiresIn: "7d" }
);

res.status(200).json({
    message: "Login successful",
    token: token
});


    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});
router.get("/dashboard", authMiddleware, (req, res) => {

    res.json({
        message: "Welcome to your dashboard 🔐",
        user: req.user
    });

});
//temp
router.get("/test", (req, res) => {
    res.send("User route working");
});

module.exports = router;

