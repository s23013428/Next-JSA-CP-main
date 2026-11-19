import "server-only";

import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import type { BookingView, FacilityAdminView, FacilityView, SlotStatus } from "./types";

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
      const status: SlotStatus = row.status === "maintenance" ? "Maintenance" : booked.has(time) ? "Booked" : "Available";
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
  const [rows] = await db.query<(RowDataPacket & { id:number; reference:string; name:string; booking_date:string; start_time:string; customer_name:string; customer_contact:string; status:string })[]>(
    `SELECT b.id, b.reference, f.name, DATE_FORMAT(b.booking_date, '%Y-%m-%d') booking_date,
      TIME_FORMAT(b.start_time, '%H:%i') start_time, b.customer_name, b.customer_contact, b.status
     FROM bookings b JOIN facilities f ON f.id = b.facility_id
     WHERE b.status = 'pending' ORDER BY b.created_at ASC`,
  );
  return rows.map((row) => ({ id: row.id, ref: row.reference, facility: row.name, when: `${row.booking_date} ${row.start_time}`, customer: row.customer_name, contact: row.customer_contact, status: "Pending" }));
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
