import "server-only";

import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import type { AuditLogView, BookingView, FacilityAdminView, FacilityView, ScheduleFacilityView, SlotStatus } from "./types";

type FacilityRow = RowDataPacket & {
  id: number; name: string; sport: FacilityView["sport"]; description: string;
  ground_type: string; hourly_rate: number; whatsapp: string; opening_time: string;
  closing_time: string; slot_minutes: number; status: FacilityView["status"];
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export async function getAvailability(date: string, sport = "All"): Promise<FacilityView[]> {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Colombo", year:"numeric", month:"2-digit", day:"2-digit" }).format(now);
  const timeParts = new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Colombo", hour:"2-digit", minute:"2-digit", hour12:false }).formatToParts(now);
  const currentMinute = Number(timeParts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(timeParts.find((part) => part.type === "minute")?.value ?? 0);
  const params: Array<string> = [date];
  let sportClause = "";
  if (["Badminton", "Cricket", "Football"].includes(sport)) {
    sportClause = "AND f.sport = ?";
    params.push(sport);
  }

  const [rows] = await db.query<FacilityRow[]>(
    `SELECT f.*, GROUP_CONCAT(TIME_FORMAT(bs.start_time, '%H:%i')) AS booked_times
     FROM facilities f
     LEFT JOIN booking_slots bs ON bs.facility_id = f.id AND bs.booking_date = ?
     WHERE f.status <> 'inactive' ${sportClause}
     GROUP BY f.id ORDER BY f.sort_order, f.name`, params,
  );

  return rows.map((row) => {
    const booked = new Set(String(row.booked_times ?? "").split(",").filter(Boolean));
    const slots: FacilityView["slots"] = [];
    for (let minute = timeToMinutes(row.opening_time); minute < timeToMinutes(row.closing_time); minute += row.slot_minutes) {
      const time = minutesToTime(minute);
      const isPast = date < today || (date === today && minute <= currentMinute);
      const status: SlotStatus = row.status === "maintenance" ? "Maintenance" : booked.has(time) ? "Booked" : isPast ? "Unavailable" : "Available";
      slots.push({ time, status });
    }
    return {
      id: row.id, name: row.name, sport: row.sport,
      rate: `LKR ${row.hourly_rate.toLocaleString("en-LK")} / hour`, rateValue: row.hourly_rate,
      description: row.description, ground: row.ground_type, whatsapp: row.whatsapp,
      status: row.status, slots,
    };
  });
}

export async function getPendingBookings(): Promise<BookingView[]> {
  return getBookings("pending");
}

export async function getBookings(status = "all"): Promise<BookingView[]> {
  const validStatus = ["pending", "confirmed", "rejected", "cancelled"].includes(status) ? status : "all";
  const [rows] = await db.query<(RowDataPacket & { id:number; reference:string; name:string; booking_date:string; start_time:string; customer_name:string; customer_contact:string; status:string })[]>(
    `SELECT b.id, b.reference, f.name, DATE_FORMAT(b.booking_date, '%Y-%m-%d') booking_date,
      TIME_FORMAT(b.start_time, '%H:%i') start_time, b.customer_name, b.customer_contact, b.status
     FROM bookings b JOIN facilities f ON f.id = b.facility_id
     WHERE (? = 'all' OR b.status = ?) ORDER BY b.booking_date DESC, b.start_time DESC`, [validStatus, validStatus],
  );
  return rows.map((row) => ({ id: row.id, ref: row.reference, facility: row.name, when: `${row.booking_date} ${row.start_time}`, customer: row.customer_name, contact: row.customer_contact, status: `${row.status[0].toUpperCase()}${row.status.slice(1)}` as BookingView["status"] }));
}

export async function getDashboardStats() {
  const [rows] = await db.query<(RowDataPacket & { activeFacilities:number; readyFacilities:number; pendingBookings:number; activeAdmins:number })[]>(
    `SELECT
      (SELECT COUNT(*) FROM facilities WHERE status <> 'inactive') activeFacilities,
      (SELECT COUNT(*) FROM facilities WHERE status = 'active') readyFacilities,
      (SELECT COUNT(*) FROM bookings WHERE status = 'pending') pendingBookings,
      (SELECT COUNT(*) FROM admins WHERE is_active = TRUE) activeAdmins`,
  );
  return rows[0];
}

export async function getAdminFacilities(): Promise<FacilityAdminView[]> {
  const [rows] = await db.query<(RowDataPacket & { id:number; name:string; sport:FacilityAdminView["sport"]; ground_type:string; hourly_rate:number; status:FacilityAdminView["status"] })[]>(
    `SELECT id, name, sport, ground_type, hourly_rate, status FROM facilities ORDER BY sort_order, name`,
  );
  return rows.map((row) => ({ id: row.id, name: row.name, sport: row.sport, ground: row.ground_type, rate: row.hourly_rate.toLocaleString("en-LK"), status: row.status }));
}

export async function getSchedule(date: string): Promise<ScheduleFacilityView[]> {
  const facilities = await getAvailability(date);
  const [rows] = await db.query<(RowDataPacket & { id:number; facility_id:number; reference:string; start_time:string; customer_name:string; customer_contact:string; status:string })[]>(
    `SELECT id, facility_id, reference, TIME_FORMAT(start_time, '%H:%i') start_time, customer_name, customer_contact, status
     FROM bookings WHERE booking_date = ? AND status IN ('pending','confirmed')`, [date],
  );
  const bookings = new Map(rows.map((row) => [`${row.facility_id}-${row.start_time}`, row]));
  return facilities.map((facility) => ({
    id: facility.id, name: facility.name, sport: facility.sport,
    slots: facility.slots.map((slot) => {
      const booking = bookings.get(`${facility.id}-${slot.time}`);
      return { time:slot.time, booking:booking ? { id:booking.id, ref:booking.reference, customer:booking.customer_name, contact:booking.customer_contact, status:`${booking.status[0].toUpperCase()}${booking.status.slice(1)}` as BookingView["status"] } : null };
    }),
  }));
}

export async function getAuditLogs(): Promise<AuditLogView[]> {
  const [rows] = await db.query<(RowDataPacket & { id:number; display_name:string | null; action:string; entity_type:string; entity_id:string | null; details:string | null; created_at:string })[]>(
    `SELECT l.id, a.display_name, l.action, l.entity_type, l.entity_id,
      COALESCE(CAST(l.details AS CHAR), '') details, DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i') created_at
     FROM audit_logs l LEFT JOIN admins a ON a.id = l.admin_id ORDER BY l.created_at DESC LIMIT 200`,
  );
  return rows.map((row) => ({ id:row.id, admin:row.display_name ?? "System", action:row.action, entity:`${row.entity_type}${row.entity_id ? ` #${row.entity_id}` : ""}`, details:row.details ?? "", createdAt:row.created_at }));
}
