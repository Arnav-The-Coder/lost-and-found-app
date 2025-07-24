import express from "express";
import User from "../models/User.js";
import { verifyAdmin } from "../middleware/admin.middleware.js";
import nodemailer from "nodemailer";

const router = express.Router();

// Create transporter to send the email.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASSWORD,
  },
});

// Add helper functions to email users.
const sendStatusEmail = (to, status) => {
  const subject = "Your Account Status Has Been Updated";
  let text = "";

  if (status === "approved") {
    text = `Hi, your account has been approved. You can now log in to the Lost & Found app.`;
  } else if (status === "rejected") {
    text = `Sorry, your account was not approved. You may contact the administrator for more details.`;
  } else if (status === "deleted") {
    text = `Your account has been permanently removed from the Lost & Found system.`;
  }

  return transporter.sendMail({
    from: `"Lost & Found Admin" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject,
    text,
  });
};

// List pending users.
router.get("/users/pending", verifyAdmin, async (req, res) => {
  const pendingUsers = await User.find({ status: "pending" }).select(
    "-password"
  );
  res.json(pendingUsers);
});

// Approve user.
router.patch("/users/:id/approve", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "approved";
    await user.save();
    await sendStatusEmail(user.email, "approved");

    res.json({ message: "User approved and notified." });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Reject user.
router.patch("/users/:id/reject", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "rejected";
    await user.save();
    await sendStatusEmail(user.email, "rejected");

    res.json({ message: "User rejected and notified." });
  } catch (error) {
    console.error("Error rejecting user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Delete user.
router.delete("/users/:id", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await sendStatusEmail(user.email, "deleted");
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted and notified." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
