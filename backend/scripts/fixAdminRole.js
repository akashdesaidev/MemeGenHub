// Script to fix admin role typo and ensure all roles are correctly set
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

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Find all users
    const users = await User.find({});

    console.log(`Found ${users.length} users`);

    // Fix roles for all users
    for (const user of users) {
      const oldRole = user.role;

      // Fix typo in admin role
      if (user.role === "amdin") {
        user.role = "admin";
      }
      // Set default role if missing
      else if (!user.role) {
        user.role = "user";
      }
      // Ensure role is valid
      else if (!["user", "admin"].includes(user.role)) {
        user.role = "user";
      }

      // Save if role changed
      if (user.role !== oldRole) {
        await user.save();
        console.log(
          `Updated ${user.name} (${user.email}): ${oldRole || "undefined"} -> ${
            user.role
          }`
        );
      } else {
        console.log(
          `No change for ${user.name} (${user.email}): Role = ${user.role}`
        );
      }
    }

    // List all users with their current roles
    console.log("\nCurrent user roles:");
    const updatedUsers = await User.find({}).select("name email role");
    updatedUsers.forEach((user) => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    mongoose.disconnect();
    console.log("\nAll roles have been fixed!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.disconnect();
    process.exit(1);
  });
