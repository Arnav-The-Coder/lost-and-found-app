import express from "express";
import nodemailer from "nodemailer";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASSWORD,
  },
});

router.post("/contact-admin", protectRoute, async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim().length === 0)
    return res.status(400).json({ message: "Message is required." });

  try {
    const mailOptions = {
      from: `"Lost & Found App" <${process.env.ADMIN_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `Contact Admin Message from User ${req.user.email}`,
      text: `User Email: ${req.user.email}\n\nMessage:\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Your message has been sent to the admin." });
  } catch (error) {
    console.error("Error sending contact admin email:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
