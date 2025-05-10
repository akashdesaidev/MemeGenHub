import express from "express";
import {
  getComments,
  addComment,
  deleteComment,
  flagComment,
  getFlaggedComments,
  unflagComment,
} from "../controllers/commentController";
import { protect, optionalAuth, adminOnly } from "../middleware/auth";

const router = express.Router();

// Specific routes should come before parameterized routes
router.get("/flagged/all", protect, adminOnly, getFlaggedComments);

// Parameterized routes
router.get("/:memeId", optionalAuth, getComments);
router.post("/:memeId", protect, addComment);
router.delete("/:commentId", protect, deleteComment);
router.post("/:commentId/flag", protect, flagComment);
router.post("/:commentId/unflag", protect, adminOnly, unflagComment);

export default router;
