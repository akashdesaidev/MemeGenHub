import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./User";

export interface IMeme extends Document {
  title: string;
  imageUrl: string;
  originalImageUrl?: string;
  topText?: string;
  bottomText?: string;
  textColor?: string;
  fontSize?: number;
  creator: IUser["_id"];
  status: "draft" | "published";
  views: number;
  votes: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  isTemplateOf?: string;
}

const MemeSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    imageUrl: {
      type: String,
      required: [true, "Please provide an image URL"],
    },
    originalImageUrl: {
      type: String,
    },
    topText: {
      type: String,
      maxlength: [200, "Top text cannot be more than 200 characters"],
    },
    bottomText: {
      type: String,
      maxlength: [200, "Bottom text cannot be more than 200 characters"],
    },
    textColor: {
      type: String,
      default: "#FFFFFF",
    },
    fontSize: {
      type: Number,
      default: 32,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    views: {
      type: Number,
      default: 0,
    },
    votes: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    isTemplateOf: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Check if model exists, if not create it
let MemeModel: Model<IMeme>;

try {
  MemeModel = mongoose.model<IMeme>("Meme");
} catch {
  MemeModel = mongoose.model<IMeme>("Meme", MemeSchema);
}

export default MemeModel;
