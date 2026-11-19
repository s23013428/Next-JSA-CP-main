"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ADMIN_SESSION_COOKIE, createAdminSession, requireAdmin, revokeCurrentSession, validateAdminCredentials } from "@/app/lib/admin-auth";
import { db, transaction } from "@/app/lib/db";
import { getAdminFacilities, getDashboardStats, getPendingBookings } from "@/app/lib/data";

export type LoginState = { error:string };
export type ActionState = { ok:boolean; message:string };

export async function login(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const admin = await validateAdminCredentials(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!admin) return { error: "Incorrect email address or password." };
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, await createAdminSession(admin.id), { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", maxAge:60 * 60 * 8, path:"/" });
  redirect("/admin");
}

export async function logout() { await revokeCurrentSession(); redirect("/admin/login"); }

export async function loadDashboard() {
  const admin = await requireAdmin();
  const [stats, bookings] = await Promise.all([getDashboardStats(), getPendingBookings()]);
  return { admin, stats, bookings };
}

export async function loadFacilities() {
  const admin = await requireAdmin();
  return { admin, facilities:await getAdminFacilities() };
}

export async function reviewBooking(bookingId: number, decision: "confirmed" | "rejected"): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!Number.isInteger(bookingId) || !["confirmed", "rejected"].includes(decision)) return { ok:false, message:"Invalid booking update." };
  try {
    await transaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>("UPDATE bookings SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'", [decision, admin.id, bookingId]);
      if (!result.affectedRows) throw new Error("This booking has already been reviewed.");
      if (decision === "rejected") await connection.execute("DELETE FROM booking_slots WHERE booking_id = ?", [bookingId]);
      await connection.execute("INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, 'booking', ?, JSON_OBJECT('status', ?))", [admin.id, "booking.reviewed", String(bookingId), decision]);
    });
  } catch (error) { return { ok:false, message:error instanceof Error ? error.message : "Unable to update booking." }; }
  revalidatePath("/"); revalidatePath("/admin");
  return { ok:true, message:`Booking marked ${decision}.` };
}

const slugify = (value:string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function saveFacility(input: { id?:number; name:string; sport:string; ground:string; rate:string }): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = input.name.trim(); const ground = input.ground.trim(); const rate = Number(input.rate.replace(/,/g, ""));
  if (!name || !ground || !["Badminton", "Cricket", "Football"].includes(input.sport) || !Number.isFinite(rate) || rate <= 0) return { ok:false, message:"Enter a valid name, sport, ground type and hourly rate." };
  if (input.id) {
    await db.execute("UPDATE facilities SET name = ?, sport = ?, ground_type = ?, hourly_rate = ? WHERE id = ?", [name, input.sport, ground, rate, input.id]);
    await db.execute("INSERT INTO audit_logs (admin_id, action, entity_type, entity_id) VALUES (?, 'facility.updated', 'facility', ?)", [admin.id, String(input.id)]);
  } else {
    const [result] = await db.execute<ResultSetHeader>("INSERT INTO facilities (slug, name, sport, ground_type, hourly_rate, sort_order) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(f.sort_order), 0) + 10 FROM facilities f))", [`${slugify(name)}-${Date.now().toString(36)}`, name, input.sport, ground, rate]);
    await db.execute("INSERT INTO audit_logs (admin_id, action, entity_type, entity_id) VALUES (?, 'facility.created', 'facility', ?)", [admin.id, String(result.insertId)]);
  }
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/facilities");
  return { ok:true, message:input.id ? "Facility updated." : "Facility added." };
}

export async function deleteFacility(id: number): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!Number.isInteger(id)) return { ok:false, message:"Invalid facility." };
  const [rows] = await db.query<(RowDataPacket & { count:number })[]>("SELECT COUNT(*) count FROM bookings WHERE facility_id = ?", [id]);
  const hasHistory = rows[0].count > 0;
  await db.execute(hasHistory ? "UPDATE facilities SET status = 'inactive' WHERE id = ?" : "DELETE FROM facilities WHERE id = ?", [id]);
  await db.execute("INSERT INTO audit_logs (admin_id, action, entity_type, entity_id) VALUES (?, 'facility.removed', 'facility', ?)", [admin.id, String(id)]);
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/facilities");
  return { ok:true, message:hasHistory ? "Facility archived because it has booking history." : "Facility deleted." };
}
