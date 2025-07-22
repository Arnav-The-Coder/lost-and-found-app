import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>.
    if (!token) return res.status(401).json({ message: "Auth token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
