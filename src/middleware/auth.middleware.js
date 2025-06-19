import jwt from "jsonwebtoken";
import User from "../models/User.js";

/*
    const response = await fetch("http://localhost:3000/api/lost", {
        method: "POST",
        body: JSON.stringify({
            object: "Phone",
            description: "Apple IPhone with a blue case.",
            image: "image_url_here",
        }),
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
*/

const protectRoute = async (req, res, next) => {
  try {
    // Get the token from the Authorization header.
    const token = req.header("Authorization").replace("Bearer ", "");
    if (!token) {
      // 401 means Unauthorized.
      return res.status(401).json({ message: "No token provided." });
    }

    // Verify the token.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by ID from the decoded token, but exclude the password field.
    // This is to ensure that the password is not sent back in the response.
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      // 401 means Unauthorized.
      return res.status(401).json({ message: "Invalid token." });
    }

    req.user = user; // Attach the user to the request object.
    next(); // Call the next middleware or route handler.
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication failed." });
  }
};

export default protectRoute;
