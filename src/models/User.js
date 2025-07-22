import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  { timestamps: true }
); // Automatically manage createdAt and updatedAt fields.

// Hash password before (pre) saving the user to the database.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next(); // If the password is not modified, skip hashing.
  }

  const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds.
  this.password = await bcrypt.hash(this.password, salt); // Hash the password with the salt.

  next(); // Call the next middleware or functionality in the stack after 'await user.save()
});

// Method to compare the provided password with the hashed password in the database.
userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password); // Compare the provided password with the hashed password.
};

const User = mongoose.model("User", userSchema);

export default User;
