import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

/*
    express.Router() creates a new, isolated instance of middleware and routing.
    Use it to group related routes together (e.g., all user-related routes,
    all authentication routes). This makes your application more organized,
    maintainable, and allows you to apply middleware specifically to these
    grouped routes.
*/
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASSWORD,
  },
});

const notifyAdmin = (email, location) => {
  return transporter.sendMail({
    from: `"Lost & Found App" <${process.env.ADMIN_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "New User Pending Approval",
    text: `A new user has registered:\nEmail: ${email}\nLocation: ${location}\nApprove or reject in your admin dashboard.`,
  });
};

const generateToken = (userId) => {
  /*
    Generates a JWT token for the user using the user ID as the payload.The token will 
    expire in 15 days. The secret key is used to sign the token, which is stored securely
    in an environment variable.
  */
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
};

router.post("/register", async (req, res) => {
  try {
    const { email, location, password } = req.body;

    if (!location || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    if (location.length < 3) {
      return res
        .status(400)
        .json({ message: "Location name must be at least 3 characters long." });
    }

    // Check if the user already exists.
    const existingEmail = await User.findOne({ email: email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const existingLocation = await User.findOne({ location: location });
    if (existingLocation) {
      return res.status(400).json({ message: "Location already exists." });
    }

    // Get random avatar image from the API.
    const profileImage = `https://api.dicebear.com/9.x/shapes/png?seed=${location}`;

    const user = new User({
      email,
      location,
      password,
      profileImage,
      status: "pending",
    });

    await user.save();

    // Notify admin of pending user using nodemailer.
    await notifyAdmin(email, location);

    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created and pending admin approval.",
    });
  } catch (error) {
    console.log("Error registering user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required." });

    // Check if the user exists.
    const user = await User.findOne({ email: email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password." });

    // Block login if user is not approved.
    if (user.status !== "approved") {
      return res
        .status(403)
        .json({ message: "Account not yet approved by admin." });
    }

    // Check if the password is correct.
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid email or password." });

    // Generate a token for the user.
    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        location: user.location,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Forgot password route.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate reset token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Save token and expiry (e.g. 1 hour) in user document.
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour.
    await user.save();

    // Send email with reset link containing the token.
    const resetUrl = `${process.env.API_URL}/api/auth/deep-reset?token=${resetToken}`;

    // Send reset email.
    await transporter.sendMail({
      from: `"Lost & Found Admin" <${process.env.ADMIN_EMAIL}>`,
      to: user.email,
      subject: "Password Reset Request",
      text:
        `Hello,\n\nYou requested a password reset for your Lost & Found account.\n` +
        `Please click the link or copy-paste it into your browser:\n${resetUrl}\n\n` +
        `This link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nThanks,\nLost & Found Team`,
      html: `
        <p>Hello,</p>
        <p>You requested a password reset for your Lost & Found account.</p>
        <p>Please click <a href="${resetUrl}">here to reset your password</a> or copy-paste the link below:</p>
        <p><code>${resetUrl}</code></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thanks,<br/>Lost & Found Team</p>
      `,
    });

    res.json({ message: "Password reset email sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

// Handles redirect from email to app deep link.
router.get("/deep-reset", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("Missing token.");
  }

  // Redirect to your app using custom URI scheme.
  const deepLink = `lostfoundapp://reset-password?token=${token}`;
  return res.redirect(302, deepLink);
});

// Reset password route.
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    // Add password validation.
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    // Find user by token and check if token still valid.
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Update password and clear fields.
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
