import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

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
      token,
      user: {
        id: user._id,
        email: user.email,
        location: user.location,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
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

export default router;
