import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (imageFile: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(imageFile, {
      folder: "imagegenhub",
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload image");
  }
};

export const generateMemeWithText = async (
  imageUrl: string,
  topText: string,
  bottomText: string,
  textColor: string = "white",
  fontSize: number = 32
): Promise<string> => {
  try {
    // If no text to add, return the original image
    if (!topText && !bottomText) {
      return imageUrl;
    }

    // Validate imageUrl is not empty
    if (!imageUrl) {
      console.error("Empty imageUrl provided to generateMemeWithText");
      return imageUrl;
    }

    // Convert hex color to RGB for Cloudinary
    const hexToRgb = (hex: string) => {
      try {
        const cleanHex = hex.replace("#", "");
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);

        // Check if values are valid numbers
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          return "white"; // Default to white if parsing fails
        }

        return `rgb:${r},${g},${b}`;
      } catch (e) {
        console.error("Error parsing color:", e);
        return "white"; // Default to white if parsing fails
      }
    };

    const color =
      textColor && textColor.startsWith("#")
        ? hexToRgb(textColor)
        : textColor || "white";
    const fontSizeVw = Math.max(Math.min(fontSize ? fontSize / 2 : 20, 60), 20); // Convert to responsive size

    // Extract the public ID from the Cloudinary URL
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
    let publicId = "";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (imageUrl.includes("cloudinary.com")) {
      try {
        // Parse the URL to extract the public ID correctly
        const urlParts = imageUrl.split("/");
        // Find the index of "upload" in the URL parts
        const uploadIndex = urlParts.findIndex((part) => part === "upload");

        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
          // Join all parts after "upload", skipping any version identifier (v1234567890)
          const remainingParts = urlParts.slice(uploadIndex + 1);
          // Filter out version identifiers
          const filteredParts = remainingParts.filter(
            (part) => !part.match(/^v\d+$/)
          );
          // Join the parts to form the public ID
          publicId = filteredParts.join("/");

          // Remove file extension if present
          publicId = publicId.replace(/\.\w+$/, "");
        }
      } catch (err) {
        console.error("Error parsing Cloudinary URL:", err, { imageUrl });
        return imageUrl; // Return original URL if parsing fails
      }
    } else {
      // For non-Cloudinary URLs, return the original URL
      console.log("Non-Cloudinary URL, returning original:", imageUrl);
      return imageUrl;
    }

    if (!publicId) {
      console.error("Could not extract public ID from URL:", imageUrl);
      return imageUrl; // Return original URL if we can't extract the public ID
    }

    // Create transformations for text overlays
    const transformations = [
      { width: 800, crop: "scale" },
      topText
        ? {
            overlay: {
              font_family: "Impact",
              font_size: fontSizeVw,
              font_weight: "bold",
              text: topText,
            },
            color: color,
            gravity: "north",
            y: 20,
            effect: "stroke:10:black",
          }
        : null,
      bottomText
        ? {
            overlay: {
              font_family: "Impact",
              font_size: fontSizeVw,
              font_weight: "bold",
              text: bottomText,
            },
            color: color,
            gravity: "south",
            y: 20,
            effect: "stroke:10:black",
          }
        : null,
    ].filter(Boolean);

    try {
      // Generate the URL with transformations using the extracted public ID
      const result = cloudinary.url(publicId, {
        transformation: transformations,
        secure: true,
      });

      console.log("Generated Cloudinary URL:", result);
      return result;
    } catch (transformError) {
      console.error(
        "Error generating Cloudinary transformation URL:",
        transformError
      );
      return imageUrl; // Return original URL if transformation fails
    }
  } catch (error) {
    console.error("Error generating meme with Cloudinary:", error);
    // Return the original image URL as fallback
    return imageUrl;
  }
};

export default cloudinary;
