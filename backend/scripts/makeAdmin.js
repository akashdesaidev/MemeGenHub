// Script to make a user an admin by email
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Get email from command line arguments
const email = process.argv[2];

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

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // If no email provided, list all users
    if (!email) {
      const users = await User.find({}).select("name email role");

      console.log("Available users:");
      users.forEach((user) => {
        console.log(
          `- ${user.name} (${user.email}) - Role: ${user.role || "undefined"}`
        );
      });

      console.log("\nUsage: node makeAdmin.js user@example.com");
      mongoose.disconnect();
      process.exit(0);
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      console.error(`User with email ${email} not found`);
      mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role || "undefined"}`);

    // Update user role to admin
    user.role = "admin";
    const updatedUser = await user.save();

    console.log(`User ${updatedUser.name} is now an admin!`);
    console.log(`New role: ${updatedUser.role}`);

    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.disconnect();
    process.exit(1);
  });
