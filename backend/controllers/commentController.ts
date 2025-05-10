import { Request, Response } from "express";
import Comment from "../models/Comment";
import Meme from "../models/Meme";

// Get comments for a meme
export const getComments = async (req: Request, res: Response) => {
  try {
    const { memeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ meme: memeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name image")
      .lean();

    const total = await Comment.countDocuments({ meme: memeId });

    res.status(200).json({
      comments,
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
