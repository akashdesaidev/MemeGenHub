import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const MONGODB_URI = process.env.MONGODB_URI;
// Global is used here to maintain a cached connection across hot reloads
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Define global with index signature
declare global {
  var mongoose: MongooseCache | undefined;
}

// Use existing cached connection if available
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

// Store in global for reuse
if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    console.log("Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };

    console.log(`Connecting to MongoDB at ${MONGODB_URI}`);

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("MongoDB connected successfully");
        return mongoose;
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error);
        // For development, allow server to continue even if DB fails
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Running in development mode without database connection"
          );
          return mongoose; // Return mongoose instance anyway
        }
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    console.error("Failed to establish MongoDB connection:", e);
    // In development, return mongoose anyway to allow app to start
    if (process.env.NODE_ENV === "development") {
      return mongoose;
    }
    throw e;
  }
}

export default dbConnect;
