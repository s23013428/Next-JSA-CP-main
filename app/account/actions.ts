"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { USER_SESSION_COOKIE } from "@/app/lib/auth-constants";
import { createUserSession, getCurrentUser, requireUser, revokeCurrentUserSession, validateUserCredentials } from "@/app/lib/user-auth";
import { db, transaction } from "@/app/lib/db";
import type { UserBookingView } from "@/app/lib/types";

export type UserAuthState = { error:string };
export type UserActionState = { ok:boolean; message:string };
const safeNext = (value:string) => value.startsWith("/") && !value.startsWith("//") ? value : "/account";

async function setUserCookie(userId:number) {
  (await cookies()).set(USER_SESSION_COOKIE, await createUserSession(userId), { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", maxAge:60 * 60 * 24 * 7, path:"/" });
}

export async function registerUser(_state:UserAuthState, formData:FormData): Promise<UserAuthState> {
  const name = String(formData.get("name") ?? "").trim(); const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim(); const password = String(formData.get("password") ?? ""); const next = safeNext(String(formData.get("next") ?? "/account"));
  if (name.length < 2 || name.length > 140) return { error:"Enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error:"Enter a valid email address." };
  if (phone.length < 7 || phone.length > 40) return { error:"Enter a valid phone number." };
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return { error:"Password must be at least 8 characters and include a letter and number." };
  try {
    const [result] = await db.execute<ResultSetHeader>("INSERT INTO users (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)", [email, await bcrypt.hash(password, 12), name, phone]);
    await setUserCookie(result.insertId);
  } catch (error) {
    return { error:(error as { code?:string }).code === "ER_DUP_ENTRY" ? "An account already exists for this email." : "Unable to create your account." };
  }
  redirect(next);
}

export async function loginUser(_state:UserAuthState, formData:FormData): Promise<UserAuthState> {
  const user = await validateUserCredentials(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!user) return { error:"Incorrect email address or password." };
  await setUserCookie(user.id);
  redirect(safeNext(String(formData.get("next") ?? "/account")));
}

export async function logoutUser() { await revokeCurrentUserSession(); redirect("/"); }

export async function getBookingViewer() { return getCurrentUser(); }

export async function loadUserPanel() {
  const user = await requireUser();
  const [rows] = await db.query<(RowDataPacket & { id:number; reference:string; facility:string; sport:UserBookingView["sport"]; booking_date:string; start_time:string; status:string; can_cancel:number; cancel_by:string; is_past:number })[]>(
    `SELECT b.id, b.reference, f.name facility, f.sport, DATE_FORMAT(b.booking_date, '%Y-%m-%d') booking_date,
      TIME_FORMAT(b.start_time, '%H:%i') start_time, b.status,
      (b.status IN ('pending','confirmed') AND TIMESTAMP(b.booking_date,b.start_time) >= DATE_ADD(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'), INTERVAL 15 MINUTE)) can_cancel,
      DATE_FORMAT(DATE_SUB(TIMESTAMP(b.booking_date,b.start_time), INTERVAL 15 MINUTE), '%Y-%m-%d %H:%i') cancel_by,
      (TIMESTAMP(b.booking_date,b.end_time) < CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30')) is_past
     FROM bookings b JOIN facilities f ON f.id=b.facility_id WHERE b.user_id=?
     ORDER BY b.booking_date DESC, b.start_time DESC`, [user.id],
  );
  const bookings:UserBookingView[] = rows.map((row) => ({ id:row.id, reference:row.reference, facility:row.facility, sport:row.sport, date:row.booking_date, time:row.start_time, status:`${row.status[0].toUpperCase()}${row.status.slice(1)}` as UserBookingView["status"], canCancel:Boolean(row.can_cancel), cancelBy:row.cancel_by, isPast:Boolean(row.is_past) }));
  return { user, bookings };
}

export async function cancelUserBooking(bookingId:number): Promise<UserActionState> {
  const user = await requireUser();
  if (!Number.isInteger(bookingId)) return { ok:false, message:"Invalid booking." };
  try {
    await transaction(async (connection) => {
      const [rows] = await connection.query<(RowDataPacket & { id:number })[]>("SELECT id FROM bookings WHERE id=? AND user_id=? AND status IN ('pending','confirmed') AND TIMESTAMP(booking_date,start_time) >= DATE_ADD(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'), INTERVAL 15 MINUTE) FOR UPDATE", [bookingId, user.id]);
      if (!rows[0]) throw new Error("Cancellation is closed. Bookings can only be cancelled until 15 minutes before the start time.");
      await connection.execute("UPDATE bookings SET status='cancelled', reviewed_at=NOW() WHERE id=?", [bookingId]);
      await connection.execute("DELETE FROM booking_slots WHERE booking_id=?", [bookingId]);
      await connection.execute("INSERT INTO audit_logs (action, entity_type, entity_id, details) VALUES ('user.booking_cancelled','booking',?,JSON_OBJECT('user_id',?))", [String(bookingId), user.id]);
    });
  } catch (error) { return { ok:false, message:error instanceof Error ? error.message : "Unable to cancel this booking." }; }
  revalidatePath("/"); revalidatePath("/account"); revalidatePath("/admin"); revalidatePath("/admin/bookings"); revalidatePath("/admin/schedule");
  return { ok:true, message:"Booking cancelled and the time slot is available again." };
}
