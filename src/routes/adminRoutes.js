import express from "express";
import User from "../models/User.js";
import { verifyAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

// List pending users.
router.get("/users/pending", verifyAdmin, async (req, res) => {
  const pendingUsers = await User.find({ status: "pending" }).select(
    "-password"
  );
  res.json(pendingUsers);
});

// Approve user.
router.patch("/users/:id/approve", verifyAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.status = "approved";
  await user.save();

  res.json({ message: "User approved" });
});

// Reject user.
router.patch("/users/:id/reject", verifyAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.status = "rejected";
  await user.save();

  res.json({ message: "User rejected" });
});

// Delete user.
router.delete("/users/:id", verifyAdmin, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ message: "User deleted" });
});

export default router;
