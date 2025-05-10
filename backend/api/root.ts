import type { VercelRequest, VercelResponse } from "@vercel/node";

// Root endpoint for Vercel
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "ImageGenHub API is running",
    version: "1.0.0",
    status: "ok",
    serverless: true,
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      buildCheck: "/api/build-check",
      memes: "/api/memes",
    },
  });
}
