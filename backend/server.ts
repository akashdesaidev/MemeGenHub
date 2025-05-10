import dotenv from "dotenv";

dotenv.config();

import express from "express";
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

// Connect to database
dbConnect()
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

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

// Routes
app.use("/api/memes", memeRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/auth", authRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "An error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
