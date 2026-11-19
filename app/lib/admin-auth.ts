import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { ADMIN_SESSION_COOKIE } from "./auth-constants";

export { ADMIN_SESSION_COOKIE };
const SESSION_HOURS = 8;
type AdminRow = RowDataPacket & { id:number; email:string; display_name:string; password_hash:string };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function validateAdminCredentials(email: string, password: string) {
  const [rows] = await db.query<AdminRow[]>("SELECT id, email, display_name, password_hash FROM admins WHERE email = ? AND is_active = TRUE LIMIT 1", [email.trim().toLowerCase()]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) return null;
  return { id: admin.id, email: admin.email, name: admin.display_name };
}

export async function createAdminSession(adminId: number) {
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  await db.execute("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))", [id, adminId, hashToken(token), SESSION_HOURS]);
  await db.execute("UPDATE admins SET last_login_at = NOW() WHERE id = ?", [adminId]);
  return `${id}.${token}`;
}

export async function getCurrentAdmin() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return null;
  const [id, token] = value.split(".");
  if (!id || !token) return null;
  const [rows] = await db.query<(RowDataPacket & { id:number; email:string; display_name:string })[]>(
    "SELECT a.id, a.email, a.display_name FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.id = ? AND s.token_hash = ? AND s.expires_at > NOW() AND a.is_active = TRUE LIMIT 1",
    [id, hashToken(token)],
  );
  const admin = rows[0];
  return admin ? { id: admin.id, email: admin.email, name: admin.display_name } : null;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(ADMIN_SESSION_COOKIE)?.value.split(".")[0];
  if (id) await db.execute("DELETE FROM admin_sessions WHERE id = ?", [id]);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
