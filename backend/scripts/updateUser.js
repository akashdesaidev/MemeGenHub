// Script to update a specific user
require("dotenv").config();
const mongoose = require("mongoose");

// Connect to MongoDB
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/imagegenhub";

// Define User schema
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    image: String,
    bio: String,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    resetToken: String,
    resetTokenExpiry: Date,
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

// User email to update
const userEmail = "akash.desai3105@gmail.com";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Find user by email
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      mongoose.disconnect();
      process.exit(1);
    }

    console.log("Current user data:");
    console.log(JSON.stringify(user.toObject(), null, 2));

    // Update the user
    user.role = "admin";

    // Save the updated user
    await user.save();

    console.log("\nUser updated successfully!");
    console.log("Updated user data:");
    console.log(JSON.stringify(user.toObject(), null, 2));

    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.disconnect();
    process.exit(1);
  });
