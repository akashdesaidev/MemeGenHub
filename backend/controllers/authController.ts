import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import mongoose from "mongoose";

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Register a new user
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        message: "Missing required fields",
        details: "Name, email and password are required",
      });
    }

    // Check if user already exists - with timeout handling
    let existingUser;
    try {
      existingUser = await User.findOne({ email }).maxTimeMS(20000); // Increase operation timeout
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError);
      return res.status(500).json({
        message: "Database connection error",
        details: "Could not check for existing user",
      });
    }

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    try {
      await user.save();
    } catch (saveError) {
      console.error("Error saving user:", saveError);
      return res.status(500).json({
        message: "Failed to create user account",
        details: "Database operation failed",
      });
    }

    // Ensure we have a valid ObjectId
    if (!isValidObjectId(user._id.toString())) {
      console.error("Invalid user ID generated:", user._id);
      return res.status(500).json({ message: "Error creating user account" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
};

// Login user
export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Missing required fields",
        details: "Email and password are required",
      });
    }

    // Find user by email with timeout handling
    let user;
    try {
      user = await User.findOne({ email }).maxTimeMS(20000); // Increase operation timeout
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError);
      return res.status(500).json({
        message: "Database connection error",
        details: "Could not retrieve user information",
      });
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check password
    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error("Password comparison error:", error);
      return res.status(500).json({ message: "Error verifying credentials" });
    }

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Ensure we have a valid ObjectId
    if (!isValidObjectId(user._id.toString())) {
      console.error("Invalid user ID found:", user._id);
      return res.status(500).json({ message: "Authentication error" });
    }

    // Generate JWT token with string ID
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Find user with timeout handling
    let user;
    try {
      // Explicitly select all fields except password, including role
      user = await User.findById(userId).select("-password").maxTimeMS(20000);
    } catch (dbError) {
      console.error("Database error during profile lookup:", dbError);
      return res.status(500).json({
        message: "Database connection error",
        details: "Could not retrieve profile information",
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure role is included in the response
    const userResponse = user.toObject();

    // Set default role if missing
    if (!userResponse.role) {
      userResponse.role = "user";

      // Update the user in the database
      try {
        user.role = "user";
        await user.save();
      } catch (saveError) {
        console.error("Error saving user role:", saveError);
        // Continue anyway, we'll just return the default role
      }
    }

    res.json(userResponse);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      message: "Server error while fetching profile",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
};

// Get public user profile by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate if userId is a valid MongoDB ObjectId
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select("-password -email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ message: "Server error while fetching user" });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { name, bio } = req.body;

    // Find user with timeout handling
    let user;
    try {
      user = await User.findById(userId).maxTimeMS(20000);
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError);
      return res.status(500).json({
        message: "Database connection error",
        details: "Could not retrieve user information",
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;

    // Handle profile image if provided
    if (req.file) {
      try {
        // Import dynamically to avoid issues with Vercel build
        const { uploadToCloudinary } = await import("../utils/cloudinary");

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(req.file);

        if (imageUrl) {
          user.image = imageUrl;
        }
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        // Don't fail the entire request if just the image upload fails
      }
    }

    try {
      await user.save();
    } catch (saveError) {
      console.error("Error saving user profile:", saveError);
      return res.status(500).json({
        message: "Failed to update profile",
        details: "Database operation failed",
      });
    }

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: "Server error while updating profile",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
};

// Change user password
export const changePassword = async (
  req: Request & { userId?: string },
  res: Response
) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error while changing password" });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user
    const user = await User.findOne({ email });

    // For security reasons, always return success even if user not found
    if (!user) {
      return res.json({
        message:
          "If an account exists with this email, password reset instructions will be sent",
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );

    // Store reset token and expiry in user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In a real app, send email with reset link
    // For now, just return the token for testing
    res.json({
      message: "Password reset instructions sent",
      resetLink: `http://localhost:3000/auth/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error while processing request" });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret"
      ) as { userId: string };
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.resetToken || user.resetToken !== token) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Check if token is expired
    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return res.status(401).json({ message: "Token has expired" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error while resetting password" });
  }
};
