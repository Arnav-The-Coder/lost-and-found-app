import express from "express";
import nodemailer from "nodemailer";
import mailgunTransport from "nodemailer-mailgun-transport";

const router = express.Router();

const transporter = nodemailer.createTransport(
  mailgunTransport({
    auth: {
      api_key: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    },
  })
);

router.post("/contact-admin", async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim().length === 0)
    return res.status(400).json({ message: "Message is required." });

  try {
    const mailOptions = {
      from: `"Lost & Found App" <no-reply@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `Contact Admin Message`,
      text: `Message:\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Your message has been sent to the admin." });
  } catch (error) {
    console.error("Error sending contact admin email:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
