import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./User";
import { IComment } from "./Comment";

export interface ICommentFlag extends Document {
  comment: IComment["_id"];
  user: IUser["_id"];
  createdAt: Date;
  updatedAt: Date;
}

const CommentFlagSchema: Schema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index to ensure a user can only flag a comment once
CommentFlagSchema.index({ comment: 1, user: 1 }, { unique: true });

// Check if model exists, if not create it
let CommentFlagModel: Model<ICommentFlag>;

try {
  CommentFlagModel = mongoose.model<ICommentFlag>("CommentFlag");
} catch {
  CommentFlagModel = mongoose.model<ICommentFlag>(
    "CommentFlag",
    CommentFlagSchema
  );
}

export default CommentFlagModel;
