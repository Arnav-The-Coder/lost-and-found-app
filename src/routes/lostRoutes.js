import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Lost from "../models/Lost.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Post a lost item, before posting, the user must be authenticated.
router.post("/", protectRoute, async (req, res) => {
  try {
    const { object, description, image } = req.body;

    if (!object || !description || !image) {
      return res.status(400).json({ message: "Please provide all fields." });
    }

    // Upload the image to Cloudinary.
    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url; // Converts uploaded image to a secure URL.
    // Save the image to the MongoDB database.
    const newLostItem = new Lost({
      object,
      description,
      image: imageUrl,
      user: req.user._id,
    });

    await newLostItem.save();

    res.status(201).json(newLostItem);
  } catch (error) {
    console.log("Error posting lost item:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Get all lost items using pagination allowing for infinite scrolling.
router.get("/", async (req, res) => {
  /*
    Example call from React Native app to get lost items:
    const response = await fetch("http://localhost:3000/api/lost?page=1&limit=5");
  */
  try {
    const page = req.query.page || 1; // Get the page number from query parameters, default to 1.
    const limit = req.query.limit || 5; // Get the limit from query parameters, default to 10.
    const skip = (page - 1) * limit; // Calculate the number of items to skip based on the page and limit.

    const lostItems = await Lost.find()
      .sort({ createdAt: -1 }) // Sort by creation date in descending order.
      .skip(skip) // Skip the number of items based on the page.
      .limit(limit) // Limit the number of items returned.
      .populate("user", "location profileImage"); // Populate the user field with location and profileImage.

    const totalItems = await Lost.countDocuments(); // Get the total number of lost items.

    res.send({
      items: lostItems,
      currentPage: page,
      totalItems: totalItems,
      totalPages: Math.ceil(totalItems / limit),
    });
  } catch (error) {
    console.log("Error fetching lost items:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Delete a lost item.
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const lostItem = await Lost.findById(req.params.id); // req.params.id is the ID of the lost item to delete.
    if (!lostItem) {
      return res.status(404).json({ message: "Lost item not found." });
    }

    // Check if the user is the creator of the lost item.
    if (lostItem.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this item." });
    }

    // Delete the image from Cloudinary.
    if (lostItem.image && lostItem.image.includes("cloudinary")) {
      try {
        /*
            https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
            The public ID is the part of the URL after the last slash and before the file.
        */
        const publicId = lostItem.image.split("/").pop().split(".")[0]; // Extract the public ID from the image URL.
        await cloudinary.uploader.destroy(publicId); // Delete the image from Cloudinary using its public ID.
      } catch (deleteError) {
        console.log("Error deleting image from Cloudinary:", deleteError);
      }
    }

    await lostItem.deleteOne(); // Delete the lost item from the database.

    res.json({ message: "Lost item deleted successfully." });
  } catch (error) {
    console.log("Error deleting lost item:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Get lost items found by the logged-in user.
router.get("/user", protectRoute, async (req, res) => {
  try {
    const lostItems = await Lost.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(lostItems);
  } catch (error) {
    console.log("Error fetching user's lost items:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
