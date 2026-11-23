require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

if (!process.env.JWT_SECRET) {
    throw new Error("Set JWT_SECRET before starting CEREBRO.");
}

const app = express();

const chatRoutes = require("./routes/chatRoutes");
const therapistRoutes = require("./routes/therapistRoutes");
const moodRoutes = require("./routes/moodRoutes");
const userRoutes = require("./routes/userRoutes");
const predictionRoutes = require("./routes/predictionRoutes");

// middleware
app.use(cors());
app.use(express.json());

app.use("/api/predict", predictionRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/therapists", therapistRoutes);

// database connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mentalHealth")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));




// test route
app.get("/", (req, res) => {
    res.send("🚀 Server is running");
});

app.get("/app", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/cerebro_frontend (5).html"));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`CEREBRO is running at http://localhost:${port}/app`);
});


