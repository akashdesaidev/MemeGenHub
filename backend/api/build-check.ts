import { Request, Response } from "express";

// Simple API endpoint to verify Vercel build and deployment
export default function handler(req: Request, res: Response) {
  res.status(200).json({
    message: "Vercel deployment is working!",
    time: new Date().toISOString(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "unknown",
  });
}
