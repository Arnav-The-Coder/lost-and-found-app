import express from "express";
import User from "../models/User.js";
import { verifyAdmin } from "../middleware/admin.middleware.js";
import nodemailer from "nodemailer";
import LostItem from "../models/Lost.js";

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
const sendStatusEmail = (to, status, appUrl = "") => {
  const subject = "Your Account Status Has Been Updated";
  let text = "";
  let html = "";

  if (status === "approved") {
    text = `Hi, your account has been approved. You can now log in to the Lost & Found app by visiting: ${appUrl}`;
    html = `
      <p>Hi,</p>
      <p>Your account has been approved. You can now log in to the Lost & Found app.</p>
      <p>Click here to access the app: <a href="${appUrl}">Lost & Found App</a></p>
      <p>Thanks,<br/>Lost & Found Team</p>
    `;
  } else if (status === "rejected") {
    text = `Sorry, your account was not approved. You may contact the administrator for more details.`;
    html = `
      <p>Sorry,</p>
      <p>Your account was not approved. You may contact the administrator for more details.</p>
      <p>Thanks,<br/>Lost & Found Team</p>
    `;
  } else if (status === "deleted") {
    text = `Your account has been permanently removed from the Lost & Found system.`;
    html = `
      <p>Your account has been permanently removed from the Lost & Found system.</p>
      <p>Thanks,<br/>Lost & Found Team</p>
    `;
  }

  return transporter.sendMail({
    from: `"Lost & Found Admin" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject,
    text, // Plain text version for clients that don't render HTML.
    html, // HTML version for rich email clients.
  });
};

// List pending users.
router.get("/users/pending", verifyAdmin, async (req, res) => {
  const pendingUsers = await User.find({ status: "pending" }).select(
    "-password"
  );
  res.json(pendingUsers);
});

// List users by status or all.
/* 
  Example queries:
  GET /users           
  GET /users?status=approved
  GET /users?status=rejected
*/
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = statusFilter ? { status: statusFilter } : {};

    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password");

    const total = await User.countDocuments(filter);

    res.json({
      users,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Handles redirect from email to app deep link.
router.get("/deep-login", (req, res) => {
  // Redirect to your app using custom URI scheme.
  const deepLink = "lostfoundapp://login";
  return res.redirect(302, deepLink);
});

// Approve user.
router.patch("/users/:id/approve", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "approved";
    await user.save();
    const appUrl = `${process.env.API_URL}/api/admin/deep-login`;
    await sendStatusEmail(user.email, "approved", appUrl);

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

    // Delete lost items owned by user.
    await LostItem.deleteMany({ user: user._id });

    await sendStatusEmail(user.email, "deleted");
    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "User and associated lost items deleted and notified.",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
