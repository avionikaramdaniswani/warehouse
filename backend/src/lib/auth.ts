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
  role: "admin" | "kepala_gudang" | "petugas";
  nik: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export interface ResetTokenPayload {
  userId: number;
  type: "reset";
}

export function signResetToken(userId: number): string {
  return jwt.sign({ userId, type: "reset" } satisfies ResetTokenPayload, secret, { expiresIn: "15m" });
}

export function verifyResetToken(token: string): ResetTokenPayload {
  const payload = jwt.verify(token, secret) as ResetTokenPayload;
  if (payload.type !== "reset") throw new Error("Bukan reset token");
  return payload;
}
