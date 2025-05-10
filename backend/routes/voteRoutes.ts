import express from "express";
import { voteMeme, getUserVote } from "../controllers/voteController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.post("/:memeId", protect, voteMeme);
router.get("/:memeId", protect, getUserVote);
router.delete("/:memeId", protect, voteMeme);

export default router;
