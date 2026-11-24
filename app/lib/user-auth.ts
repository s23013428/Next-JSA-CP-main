import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { USER_SESSION_COOKIE } from "./auth-constants";

const SESSION_DAYS = 7;
const hashToken = (token:string) => createHash("sha256").update(token).digest("hex");
type UserRow = RowDataPacket & { id:number; email:string; full_name:string; phone:string; password_hash:string };

export async function validateUserCredentials(email:string, password:string) {
  const [rows] = await db.query<UserRow[]>("SELECT id, email, full_name, phone, password_hash FROM users WHERE email = ? AND is_active = TRUE LIMIT 1", [email.trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;
  return { id:user.id, email:user.email, name:user.full_name, phone:user.phone };
}

export async function createUserSession(userId:number) {
  const id = randomUUID(); const token = randomBytes(32).toString("hex");
  await db.execute("INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))", [id, userId, hashToken(token), SESSION_DAYS]);
  return `${id}.${token}`;
}

export async function getCurrentUser() {
  const value = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  if (!value) return null;
  const [id, token] = value.split(".");
  if (!id || !token) return null;
  const [rows] = await db.query<(RowDataPacket & { id:number; email:string; full_name:string; phone:string })[]>(
    "SELECT u.id, u.email, u.full_name, u.phone FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = TRUE LIMIT 1",
    [id, hashToken(token)],
  );
  const user = rows[0];
  return user ? { id:user.id, email:user.email, name:user.full_name, phone:user.phone } : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  return user;
}

export async function revokeCurrentUserSession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(USER_SESSION_COOKIE)?.value.split(".")[0];
  if (id) await db.execute("DELETE FROM user_sessions WHERE id = ?", [id]);
  cookieStore.delete(USER_SESSION_COOKIE);
}
