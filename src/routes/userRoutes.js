import express from "express";
import User from "../models/User.js";
import Lost from "../models/Lost.js";

import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.delete("/delete", protectRoute, async (req, res) => {
  try {
    const user = req.user;

    // Delete all lost items for this user.
    await Lost.deleteMany({ user: user._id });

    // Delete the user.
    await User.findByIdAndDelete(user._id);

    res.json({ message: "Account and associated items deleted." });
  } catch (error) {
    console.error("Error deleting account: ", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
