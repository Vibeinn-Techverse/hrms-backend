// src/utils/Jwt.util.ts
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET_KEY || "default_secret";

interface JWTPayload {
  id: string;
  clerkUid: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  exp: number;
}

export const generateToken = (payload: Omit<JWTPayload, 'exp'>): string => {
  const tokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
  };

  return jwt.sign(tokenPayload, JWT_SECRET, { algorithm: "HS256" });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      throw new Error("Token expired");
    }
    
    return decoded;
  } catch (error: any) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};