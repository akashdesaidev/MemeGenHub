import express from "express";
import {
  getComments,
  addComment,
  deleteComment,
  flagComment,
} from "../controllers/commentController";
import { protect, optionalAuth } from "../middleware/auth";

const router = express.Router();

router.get("/:memeId", optionalAuth, getComments);
router.post("/:memeId", protect, addComment);
router.delete("/:commentId", protect, deleteComment);
router.post("/:commentId/flag", protect, flagComment);

export default router;
