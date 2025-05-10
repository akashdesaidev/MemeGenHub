import type { VercelRequest, VercelResponse } from "@vercel/node";

// Simple API endpoint to verify Vercel build and deployment
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "Vercel deployment is working!",
    time: new Date().toISOString(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "unknown",
    path: req.url || "/api/build-check",
  });
}
