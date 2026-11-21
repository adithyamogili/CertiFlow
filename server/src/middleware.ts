
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

interface AuthPayload extends JwtPayload {
  userId: string;
  role: UserRole;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required"
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      !decoded.userId ||
      !Object.values(UserRole).includes(decoded.role as UserRole)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token"
      });
    }

    res.locals.auth = decoded as AuthPayload;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired authentication token"
    });
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.auth as AuthPayload | undefined;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action"
      });
    }

    next();
  };
}
