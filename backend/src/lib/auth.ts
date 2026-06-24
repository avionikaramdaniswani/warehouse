import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "8h";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET wajib diset dan minimal 32 karakter di production!",
    );
  } else {
    console.warn(
      "[WARN] JWT_SECRET tidak diset atau terlalu pendek. Set JWT_SECRET di environment secrets sebelum deploy ke production.",
    );
  }
}

const secret = JWT_SECRET ?? "dev-only-secret-do-not-use-in-production-32c";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  userId: number;
  role: "admin" | "operator" | "viewer";
  nik: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
