const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {

    const authHeader = req.header("Authorization");

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    // Remove "Bearer "
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Invalid token format" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "SUPER_SECRET_KEY");

        req.user = verified; // now you can access user id in protected routes

        next(); // move to next function

    } catch (err) {
        res.status(400).json({ message: "Invalid Token" });
    }
};

module.exports = authMiddleware;
