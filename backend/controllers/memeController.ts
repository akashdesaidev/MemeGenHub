import { Request, Response } from "express";
import Meme, { IMeme } from "../models/Meme";
import { uploadImage, generateMemeWithText } from "../config/cloudinary";
import mongoose, { Model } from "mongoose";

// Type assertion helper for Mongoose models
const asModel = <T>(model: any): Model<T> => model as Model<T>;

// Get all memes with pagination and sorting
export const getMemes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || "createdAt";
    const sortDirection = req.query.sortDirection === "asc" ? 1 : -1;

    // Handle special sort cases for 'top' periods
    let sortQuery: any = {};
    if (sort === "top-day") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      sortQuery = { createdAt: { $gte: oneDayAgo } };
      // Use find filter for date range and sort by votes
      const memes = await asModel<IMeme>(Meme)
        .find({ status: "published", createdAt: { $gte: oneDayAgo } })
        .sort({ votes: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("creator", "name image")
        .lean();

      const total = await asModel<IMeme>(Meme).countDocuments({
        status: "published",
        createdAt: { $gte: oneDayAgo },
      });

      return res.status(200).json({
        memes,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        itemsPerPage: limit,
      });
    } else if (sort === "top-week") {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      sortQuery = { createdAt: { $gte: oneWeekAgo } };
      // Use find filter for date range and sort by votes
      const memes = await asModel<IMeme>(Meme)
        .find({ status: "published", createdAt: { $gte: oneWeekAgo } })
        .sort({ votes: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("creator", "name image")
        .lean();

      const total = await asModel<IMeme>(Meme).countDocuments({
        status: "published",
        createdAt: { $gte: oneWeekAgo },
      });

      return res.status(200).json({
        memes,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        itemsPerPage: limit,
      });
    } else {
      sortQuery = { [sort]: sortDirection };
    }

    // Use type assertion to fix the TypeScript error
    const memes = await asModel<IMeme>(Meme)
      .find({ status: "published" })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate("creator", "name image")
      .lean();

    const total = await asModel<IMeme>(Meme).countDocuments({
      status: "published",
    });

    res.status(200).json({
      memes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalItems: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
      nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error("Error fetching memes:", error);
    res.status(500).json({ message: "Failed to fetch memes" });
  }
};

// Get a single meme by ID
export const getMeme = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meme ID format" });
    }

    const meme = await asModel<IMeme>(Meme)
      .findById(id)
      .populate("creator", "name image")
      .lean();

    if (!meme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    // Increment view count
    await asModel<IMeme>(Meme).findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.status(200).json(meme);
  } catch (error) {
    console.error("Error fetching meme:", error);
    res.status(500).json({ message: "Failed to fetch meme" });
  }
};

// Create a new meme
export const createMeme = async (req: Request, res: Response) => {
  try {
    const {
      title,
      topText,
      bottomText,
      textColor,
      fontSize,
      imageData,
      status,
    } = req.body;

    if (!title || !imageData) {
      return res.status(400).json({ message: "Title and image are required" });
    }

    let imageUrl = "";
    let finalImageUrl = "";

    // Check if imageData is a URL or base64 data
    if (imageData.startsWith("data:image")) {
      // Upload image to Cloudinary
      try {
        imageUrl = await uploadImage(imageData);
      } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return res.status(500).json({ message: "Failed to upload image" });
      }
    } else {
      // If it's already a URL, use it directly
      imageUrl = imageData;
    }

    // Generate meme with text overlay if text is provided
    if (topText || bottomText) {
      try {
        finalImageUrl = await generateMemeWithText(
          imageUrl,
          topText || "",
          bottomText || "",
          textColor,
          fontSize
        );
      } catch (error) {
        console.error("Error generating meme:", error);
        // Fall back to original image if text overlay fails
        finalImageUrl = imageUrl;
      }
    } else {
      finalImageUrl = imageUrl;
    }

    const meme = new Meme({
      title,
      imageUrl: finalImageUrl,
      originalImageUrl: imageUrl, // Store original image URL for editing
      topText,
      bottomText,
      textColor,
      fontSize,
      status: status || "draft",
      creator: req.user?.id, // Assuming user is attached to request by auth middleware
    });

    await meme.save();

    res.status(201).json(meme);
  } catch (error) {
    console.error("Error creating meme:", error);
    res.status(500).json({ message: "Failed to create meme" });
  }
};

// Update a meme
export const updateMeme = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meme ID format" });
    }

    const {
      title,
      topText,
      bottomText,
      textColor,
      fontSize,
      imageData,
      status,
    } = req.body;

    const meme = await asModel<IMeme>(Meme).findById(id);

    if (!meme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    // Check if user is the creator
    if (meme.creator.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this meme" });
    }

    // If new image is provided, upload it
    let imageUrl = meme.originalImageUrl || meme.imageUrl;
    if (imageData && imageData.startsWith("data:image")) {
      imageUrl = await uploadImage(imageData);
    } else if (imageData) {
      imageUrl = imageData;
    }

    // Generate meme with text overlay
    let finalImageUrl = imageUrl;
    if (topText || bottomText) {
      try {
        finalImageUrl = await generateMemeWithText(
          imageUrl,
          topText || "",
          bottomText || "",
          textColor,
          fontSize
        );
      } catch (error) {
        console.error("Error generating meme:", error);
        // Fall back to original image if text overlay fails
      }
    }

    const updatedMeme = await asModel<IMeme>(Meme).findByIdAndUpdate(
      id,
      {
        title,
        imageUrl: finalImageUrl,
        originalImageUrl: imageUrl,
        topText,
        bottomText,
        textColor,
        fontSize,
        status,
      },
      { new: true }
    );

    res.status(200).json(updatedMeme);
  } catch (error) {
    console.error("Error updating meme:", error);
    res.status(500).json({ message: "Failed to update meme" });
  }
};

// Delete a meme
export const deleteMeme = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meme ID format" });
    }

    const meme = await asModel<IMeme>(Meme).findById(id);

    if (!meme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    // Check if user is the creator
    if (meme.creator.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this meme" });
    }

    await asModel<IMeme>(Meme).findByIdAndDelete(id);

    res.status(200).json({ message: "Meme deleted successfully" });
  } catch (error) {
    console.error("Error deleting meme:", error);
    res.status(500).json({ message: "Failed to delete meme" });
  }
};

// Get user's memes
export const getUserMemes = async (req: Request, res: Response) => {
  try {
    // Check if user object exists in request
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.params.userId || req.user.id;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    // Validate if userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const query: any = { creator: userId };
    if (status) {
      query.status = status;
    }

    try {
      const memes = await asModel<IMeme>(Meme)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("creator", "name image")
        .lean();

      const total = await asModel<IMeme>(Meme).countDocuments(query);

      return res.status(200).json({
        memes,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        itemsPerPage: limit,
      });
    } catch (dbError) {
      console.error("Database error fetching user memes:", dbError);
      // Fallback to empty array with pagination data
      return res.status(200).json({
        memes: [],
        totalPages: 0,
        currentPage: page,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null,
        itemsPerPage: limit,
      });
    }
  } catch (error) {
    console.error("Error fetching user memes:", error);
    res.status(500).json({
      message: "Failed to fetch user memes",
      memes: [],
    });
  }
};
