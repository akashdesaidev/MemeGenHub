// app.ts
import dotenv from "dotenv";

dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dbConnect from "./config/database";
import memeRoutes from "./routes/memeRoutes";
import voteRoutes from "./routes/voteRoutes";
import commentRoutes from "./routes/commentRoutes";
import authRoutes from "./routes/authRoutes";
import path from "path";

// Set NODE_ENV to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

console.log(`Running in ${process.env.NODE_ENV} mode`);

// Connect to database - but only if not in serverless environment
// Vercel Functions should connect to DB as needed
if (!process.env.VERCEL) {
  dbConnect()
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration with proper origin handling
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory (for local development)
// For production, use Cloudinary or other cloud storage
if (process.env.NODE_ENV === "development") {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
}

// Add a simple root route for health checks
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "ImageGenHub API is running",
    status: "ok",
    environment: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/memes", memeRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/auth", authRoutes);

// Health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Handle 404s
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found", path: req.url });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    message: "An error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server only in non-serverless environments
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// For serverless environments, export the app as middleware
export default app;
