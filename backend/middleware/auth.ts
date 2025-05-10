import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User";

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

// Extend Request type to include user
declare module "express" {
  interface Request {
    user?: {
      id: string;
      email?: string;
      name?: string;
      role?: string;
    };
  }
}

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Middleware to protect routes
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authenticated, no token provided" });
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret"
      ) as DecodedToken;

      // Validate userId format
      if (!decoded.userId) {
        return res
          .status(401)
          .json({ message: "Invalid token: missing userId" });
      }

      // Validate that userId is a valid MongoDB ObjectId
      if (!isValidObjectId(decoded.userId)) {
        console.error("Invalid ObjectId in token:", decoded.userId);
        return res
          .status(401)
          .json({ message: "Invalid token: malformed userId" });
      }

      // Add user to request
      req.user = {
        id: decoded.userId,
      };

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res
        .status(401)
        .json({ message: "Not authenticated, invalid token" });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Optional authentication middleware (doesn't block unauthenticated users)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      try {
        // Verify token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your_jwt_secret"
        ) as DecodedToken;

        // Validate userId format
        if (decoded.userId && isValidObjectId(decoded.userId)) {
          // Add user to request
          req.user = {
            id: decoded.userId,
          };
        } else {
          console.warn("Invalid userId in token:", decoded.userId);
        }
      } catch (error) {
        // Invalid token, but continue without authentication
        console.warn("Invalid token in optionalAuth:", error);
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    console.error("Error in optionalAuth:", error);
    next();
  }
};

// Admin only middleware
export const adminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Get user from database to check role
    const user = await User.findById(req.user.id).select("role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized, admin access required" });
    }

    // Add role to user object in request
    req.user.role = user.role;

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
