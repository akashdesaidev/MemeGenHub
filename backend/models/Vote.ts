import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./User";
import { IMeme } from "./Meme";

export interface IVote extends Document {
  meme: IMeme["_id"];
  user: IUser["_id"];
  value: 1 | -1; // 1 for upvote, -1 for downvote
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema: Schema = new Schema(
  {
    meme: {
      type: Schema.Types.ObjectId,
      ref: "Meme",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: {
      type: Number,
      enum: [1, -1],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only vote once per meme
VoteSchema.index({ meme: 1, user: 1 }, { unique: true });

// Check if model exists, if not create it
let VoteModel: Model<IVote>;

try {
  VoteModel = mongoose.model<IVote>("Vote");
} catch {
  VoteModel = mongoose.model<IVote>("Vote", VoteSchema);
}

export default VoteModel;
