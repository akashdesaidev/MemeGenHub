import type { VercelRequest, VercelResponse } from "@vercel/node";

// Health check endpoint that doesn't depend on the Express app
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    serverless: true,
    timestamp: new Date().toISOString(),
    path: req.url || "/api/health",
  });
}
