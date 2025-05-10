import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

// Extend Express Request interface to include userId and user object
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
      };
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;

  // No token provided, but allow the request to continue
  // The controller will handle access control
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  // Skip auth check if no token is provided (allow guest access)
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    ) as DecodedToken;

    // Set both user.id and userId for compatibility
    req.userId = decoded.userId;
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    console.warn("Auth token validation failed:", error);
    // Don't block the request, just clear the auth info
    req.userId = undefined;
    req.user = undefined;
    next();
  }
};
