import express from "express";
import {
  getMemes,
  getMeme,
  createMeme,
  updateMeme,
  deleteMeme,
  getUserMemes,
} from "../controllers/memeController";
import { protect, optionalAuth } from "../middleware/auth";

const router = express.Router();

// Public routes
router.get("/", optionalAuth, getMemes);

// Protected routes
router.post("/", protect, createMeme);
router.get("/user/:userId?", protect, getUserMemes);

// This needs to be after /user to prevent conflicts
router.get("/:id", optionalAuth, getMeme);
router.put("/:id", protect, updateMeme);
router.delete("/:id", protect, deleteMeme);

export default router;
