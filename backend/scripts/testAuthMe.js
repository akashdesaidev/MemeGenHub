// Script to test the auth/me endpoint
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

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

// Mock the auth/me endpoint logic
async function mockAuthMe(userId) {
  try {
    // This simulates what happens in the getProfile controller function
    const user = await User.findById(userId).select("-password");

    if (!user) {
      console.log("User not found");
      return null;
    }

    // Convert to plain object (like .lean() would do)
    const userObj = user.toObject();

    // This is what would be returned to the client
    return userObj;
  } catch (err) {
    console.error("Error:", err);
    return null;
  }
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Find all users
    const users = await User.find({}).select("_id name email role");

    console.log(`Found ${users.length} users\n`);

    // Test the auth/me endpoint for each user
    for (const user of users) {
      console.log(`Testing auth/me for user: ${user.name} (${user.email})`);

      // Create a JWT token for this user
      const token = jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1h" }
      );

      console.log(`JWT Token: ${token.substring(0, 20)}...`);

      // Mock the auth/me endpoint
      const authMeResponse = await mockAuthMe(user._id);

      console.log("auth/me response:");
      console.log(JSON.stringify(authMeResponse, null, 2));
      console.log("--------------------------------------------------\n");
    }

    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.disconnect();
    process.exit(1);
  });
