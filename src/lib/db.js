import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected successfully:", conn.connection.host);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1); // Exit the process with failure.
  }
};

export default connectDB;
