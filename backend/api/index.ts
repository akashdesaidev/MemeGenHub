import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../server";

// This file is used by Vercel to handle all API routes as a single serverless function
// Export a direct handler function for Vercel serverless

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Pass the request to the Express app
  return app(req, res);
}
