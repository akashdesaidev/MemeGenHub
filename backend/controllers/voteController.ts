import { Request, Response } from "express";
import Vote from "../models/Vote";
import Meme from "../models/Meme";

// Vote on a meme (upvote or downvote)
export const voteMeme = async (req: Request, res: Response) => {
  try {
    const { memeId } = req.params;
    const { value } = req.body;
    const userId = req.user.id;

    // Validate vote value
    if (value !== 1 && value !== -1) {
      return res
        .status(400)
        .json({ message: "Vote value must be 1 (upvote) or -1 (downvote)" });
    }

    // Check if meme exists
    const meme = await Meme.findById(memeId);
    if (!meme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    // Check if user has already voted on this meme
    const existingVote = await Vote.findOne({ meme: memeId, user: userId });

    if (existingVote) {
      // User is changing their vote
      if (existingVote.value !== value) {
        // Update vote value
        existingVote.value = value;
        await existingVote.save();

        // Update meme vote count (multiply by 2 because we're flipping the vote)
        await Meme.findByIdAndUpdate(memeId, { $inc: { votes: value * 2 } });

        return res.status(200).json({ message: "Vote updated successfully" });
      } else {
        // User is removing their vote
        await Vote.findByIdAndDelete(existingVote._id);

        // Update meme vote count
        await Meme.findByIdAndUpdate(memeId, { $inc: { votes: -value } });

        return res.status(200).json({ message: "Vote removed successfully" });
      }
    } else {
      // User is voting for the first time
      await Vote.create({
        meme: memeId,
        user: userId,
        value,
      });

      // Update meme vote count
      await Meme.findByIdAndUpdate(memeId, { $inc: { votes: value } });

      return res.status(201).json({ message: "Vote added successfully" });
    }
  } catch (error) {
    console.error("Error voting on meme:", error);
    res.status(500).json({ message: "Failed to vote on meme" });
  }
};

// Get user's vote on a specific meme
export const getUserVote = async (req: Request, res: Response) => {
  try {
    const { memeId } = req.params;
    const userId = req.user.id;

    const vote = await Vote.findOne({ meme: memeId, user: userId });

    if (!vote) {
      return res.status(404).json({ message: "No vote found" });
    }

    res.status(200).json({ value: vote.value });
  } catch (error) {
    console.error("Error fetching user vote:", error);
    res.status(500).json({ message: "Failed to fetch user vote" });
  }
};
