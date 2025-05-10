import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../server";
import dbConnect from "../config/database";

// This file is used by Vercel to handle all API routes as a single serverless function
// Export a direct handler function for Vercel serverless

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Ensure database connection before handling request
    await dbConnect();

    // Pass the request to the Express app
    return app(req, res);
  } catch (error) {
    console.error("API handler error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to connect to database",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
