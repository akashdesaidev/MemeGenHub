import { Request, Response } from "express";

// Health check endpoint that doesn't depend on the Express app
export default function handler(req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    serverless: true,
    timestamp: new Date().toISOString(),
  });
}
