"use server";
import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ADMIN_SESSION_COOKIE, createAdminSession, requireAdmin, revokeCurrentSession, validateAdminCredentials } from "@/app/lib/admin-auth";
import { db, transaction } from "@/app/lib/db";
import { getAdminFacilities, getAuditLogs, getBookings, getDashboardStats, getPendingBookings, getSchedule } from "@/app/lib/data";

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

export async function loadBookings(status = "all") {
  const admin = await requireAdmin();
  return { admin, bookings:await getBookings(status) };
}

export async function loadSchedule(date: string) {
  const admin = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { admin, facilities:[] };
  return { admin, facilities:await getSchedule(date) };
}

export async function loadAuditLog() {
  const admin = await requireAdmin();
  return { admin, logs:await getAuditLogs() };
}

export async function saveScheduleBooking(input: { id?:number; facilityId:number; date:string; time:string; customer:string; contact:string; status:"pending" | "confirmed" | "cancelled" }): Promise<ActionState> {
  const admin = await requireAdmin();
  const customer = input.customer.trim(); const contact = input.contact.trim();
  if (!Number.isInteger(input.facilityId) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time) || customer.length < 2 || customer.length > 140 || contact.length < 5 || contact.length > 190 || !["pending", "confirmed", "cancelled"].includes(input.status)) {
    return { ok:false, message:"Enter a valid facility, date, time, customer and contact." };
  }
  try {
    await transaction(async (connection) => {
      const [facilities] = await connection.query<(RowDataPacket & { slot_minutes:number; opening_time:string; closing_time:string; status:string })[]>("SELECT slot_minutes, opening_time, closing_time, status FROM facilities WHERE id = ? FOR UPDATE", [input.facilityId]);
      const facility = facilities[0];
      if (!facility || facility.status === "inactive") throw new Error("That facility is not available.");
      const toMinutes = (value:string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
      const selected = toMinutes(input.time); const opening = toMinutes(facility.opening_time); const closing = toMinutes(facility.closing_time);
      if (selected < opening || selected >= closing || (selected - opening) % facility.slot_minutes !== 0) throw new Error("Choose a valid facility time slot.");

      let bookingId = input.id;
      if (bookingId) {
        const [existing] = await connection.query<(RowDataPacket & { id:number })[]>("SELECT id FROM bookings WHERE id = ? FOR UPDATE", [bookingId]);
        if (!existing[0]) throw new Error("This schedule entry no longer exists.");
        await connection.execute("DELETE FROM booking_slots WHERE booking_id = ?", [bookingId]);
        await connection.execute("UPDATE bookings SET facility_id = ?, booking_date = ?, start_time = ?, end_time = ADDTIME(?, SEC_TO_TIME(? * 60)), customer_name = ?, customer_contact = ?, status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?", [input.facilityId, input.date, input.time, input.time, facility.slot_minutes, customer, contact, input.status, admin.id, bookingId]);
      } else {
        const reference = `JSA-${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
        const [result] = await connection.execute<ResultSetHeader>("INSERT INTO bookings (reference, facility_id, booking_date, start_time, end_time, customer_name, customer_contact, status, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ADDTIME(?, SEC_TO_TIME(? * 60)), ?, ?, ?, ?, NOW())", [reference, input.facilityId, input.date, input.time, input.time, facility.slot_minutes, customer, contact, input.status, admin.id]);
        bookingId = result.insertId;
      }
      if (input.status !== "cancelled") await connection.execute("INSERT INTO booking_slots (booking_id, facility_id, booking_date, start_time) VALUES (?, ?, ?, ?)", [bookingId, input.facilityId, input.date, input.time]);
      await connection.execute("INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, 'booking', ?, JSON_OBJECT('date', ?, 'time', ?, 'status', ?))", [admin.id, input.id ? "schedule.updated" : "schedule.created", String(bookingId), input.date, input.time, input.status]);
    });
  } catch (error) {
    const code = (error as { code?:string }).code;
    return { ok:false, message:code === "ER_DUP_ENTRY" ? "That facility time is already reserved." : error instanceof Error ? error.message : "Unable to save the schedule entry." };
  }
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/bookings"); revalidatePath("/admin/schedule"); revalidatePath("/admin/audit");
  return { ok:true, message:input.id ? "Schedule entry updated." : "Schedule entry added." };
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
