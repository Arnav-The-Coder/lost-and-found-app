import mongoose from "mongoose";

const lostSchema = new mongoose.Schema(
  {
    object: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Lost = mongoose.model("Lostitem", lostSchema);

export default Lost;
