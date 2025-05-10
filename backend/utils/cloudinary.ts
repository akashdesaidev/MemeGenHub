import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// Upload an image to Cloudinary
export const uploadToCloudinary = async (file: any): Promise<string> => {
  try {
    if (!file) return "";

    // For memory storage (Buffer)
    if (file.buffer) {
      // Convert buffer to base64
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "imagegenhub/profile",
        resource_type: "auto",
      });

      return result.secure_url;
    }
    // For disk storage (file path)
    else if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "imagegenhub/profile",
        resource_type: "auto",
      });

      return result.secure_url;
    }

    return "";
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return "";
  }
};
