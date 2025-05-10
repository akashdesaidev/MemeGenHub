import express, { Request, Response } from "express";
import app from "../server";

// This file is used by Vercel to handle all API routes as a single serverless function
// It re-exports the main Express app

export default app;

// Vercel serverless functions handler that forwards to Express
module.exports = (req: Request, res: Response) => {
  // Express app handles the request
  return app(req, res);
};
