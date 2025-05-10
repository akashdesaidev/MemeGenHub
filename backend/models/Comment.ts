import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./User";
import { IMeme } from "./Meme";

export interface IComment extends Document {
  text: string;
  meme: IMeme["_id"];
  creator: IUser["_id"];
  flagged: boolean;
  flagCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    text: {
      type: String,
      required: [true, "Please provide comment text"],
      maxlength: [140, "Comment cannot be more than 140 characters"],
    },
    meme: {
      type: Schema.Types.ObjectId,
      ref: "Meme",
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    flagCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Check if model exists, if not create it
let CommentModel: Model<IComment>;

try {
  CommentModel = mongoose.model<IComment>("Comment");
} catch {
  CommentModel = mongoose.model<IComment>("Comment", CommentSchema);
}

export default CommentModel;
