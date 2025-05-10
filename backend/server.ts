// app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import dbConnect from "./config/database";
import memeRoutes from "./routes/memeRoutes";
import voteRoutes from "./routes/voteRoutes";
import commentRoutes from "./routes/commentRoutes";
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
}

app.use("/api/memes", memeRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "An error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
