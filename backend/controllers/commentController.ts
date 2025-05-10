import { Request, Response } from "express";
import Comment from "../models/Comment";
import CommentFlag from "../models/CommentFlag";
import Meme from "../models/Meme";

// Get comments for a meme
export const getComments = async (req: Request, res: Response) => {
  try {
    const { memeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Only show flagged comments to admins
    const isAdmin = req.user && "role" in req.user && req.user.role === "admin";
    const query = { meme: memeId };

    if (!isAdmin) {
      // For non-admin users, filter out flagged comments
      Object.assign(query, { flagged: { $ne: true } });
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name image")
      .select("text creator createdAt flagged flagCount")
      .lean();

    // If user is authenticated, check which comments they've flagged
    let userFlaggedComments: string[] = [];
    if (req.user) {
      const userId = req.user.id;
      const commentIds = comments.map((comment) => comment._id);

      const userFlags = await CommentFlag.find({
        comment: { $in: commentIds },
        user: userId,
      }).select("comment");

      userFlaggedComments = userFlags.map((flag) => flag.comment.toString());
    }

    const total = await Comment.countDocuments(query);

    res.status(200).json({
      comments,
      userFlaggedComments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

// Add a comment to a meme
export const addComment = async (req: Request, res: Response) => {
  try {
    const { memeId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    if (text.length > 140) {
      return res
        .status(400)
        .json({ message: "Comment cannot exceed 140 characters" });
    }

    // Check if meme exists
    const meme = await Meme.findById(memeId);
    if (!meme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    // Create comment
    const comment = await Comment.create({
      text,
      meme: memeId,
      creator: userId,
    });

    // Update comment count on meme
    await Meme.findByIdAndUpdate(memeId, { $inc: { commentCount: 1 } });

    // Populate creator info
    const populatedComment = await Comment.findById(comment._id)
      .populate("creator", "name image")
      .lean();

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// Delete a comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is the creator of the comment
    if (comment.creator.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    // Delete comment
    await Comment.findByIdAndDelete(commentId);

    // Update comment count on meme
    await Meme.findByIdAndUpdate(comment.meme, { $inc: { commentCount: -1 } });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

// Flag a comment as inappropriate
export const flagComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Find the comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user has already flagged this comment
    const existingFlag = await CommentFlag.findOne({
      comment: commentId,
      user: userId,
    });

    if (existingFlag) {
      return res
        .status(400)
        .json({ message: "You have already flagged this comment" });
    }

    // Create a new flag record
    await CommentFlag.create({
      comment: commentId,
      user: userId,
    });

    // Increment flag count and set flagged to true if threshold reached
    comment.flagCount += 1;

    // If flag count reaches threshold (e.g., 3), mark as flagged
    if (comment.flagCount >= 3) {
      comment.flagged = true;
    }

    await comment.save();

    res.status(200).json({ message: "Comment flagged successfully" });
  } catch (error) {
    console.error("Error flagging comment:", error);
    res.status(500).json({ message: "Failed to flag comment" });
  }
};

// Get all flagged comments (admin only)
export const getFlaggedComments = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ flagged: true })
      .sort({ flagCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name image")
      .populate("meme", "title imageUrl")
      .select("text creator meme createdAt flagged flagCount")
      .lean();

    const total = await Comment.countDocuments({ flagged: true });

    res.status(200).json({
      comments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching flagged comments:", error);
    res.status(500).json({ message: "Failed to fetch flagged comments" });
  }
};

// Unflag a comment (admin only)
export const unflagComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    // Find the comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Reset flag count and status
    comment.flagged = false;
    comment.flagCount = 0;
    await comment.save();

    // Remove all flag records for this comment
    await CommentFlag.deleteMany({ comment: commentId });

    res.status(200).json({ message: "Comment unflagged successfully" });
  } catch (error) {
    console.error("Error unflagging comment:", error);
    res.status(500).json({ message: "Failed to unflag comment" });
  }
};
