"use server";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { transaction } from "./lib/db";
import { getAvailability } from "./lib/data";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
export async function checkAvailability(date:string, sport:string) {
  if (!DATE_PATTERN.test(date)) return { ok:false, message:"Choose a valid date.", facilities:[] };
  return { ok:true, message:"", facilities:await getAvailability(date, sport) };
}

export async function createBooking(input: { facilityId:number; date:string; time:string; name:string; contact:string }) {
  const name = input.name.trim(); const contact = input.contact.trim();
  if (!Number.isInteger(input.facilityId) || !DATE_PATTERN.test(input.date) || !TIME_PATTERN.test(input.time) || name.length < 2 || name.length > 140 || contact.length < 5 || contact.length > 190) return { ok:false, message:"Enter your name and a valid phone number or email." };
  try {
    const reference = await transaction(async (connection) => {
      const [facilities] = await connection.query<(RowDataPacket & { id:number; slot_minutes:number; status:string; opening_time:string; closing_time:string })[]>("SELECT id, slot_minutes, status, opening_time, closing_time FROM facilities WHERE id = ? AND ? >= CURDATE() FOR UPDATE", [input.facilityId, input.date]);
      const facility = facilities[0];
      if (!facility || facility.status !== "active") throw new Error("This facility is not currently available.");
      const [hours, minutes] = input.time.split(":").map(Number);
      const selectedMinutes = hours * 60 + minutes;
      const [openingHour, openingMinute] = facility.opening_time.split(":").map(Number);
      const [closingHour, closingMinute] = facility.closing_time.split(":").map(Number);
      const openingMinutes = openingHour * 60 + openingMinute;
      const closingMinutes = closingHour * 60 + closingMinute;
      if (selectedMinutes < openingMinutes || selectedMinutes >= closingMinutes || (selectedMinutes - openingMinutes) % facility.slot_minutes !== 0) throw new Error("Choose a valid available time slot.");
      const reference = `JSA-${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
      const [result] = await connection.execute<ResultSetHeader>("INSERT INTO bookings (reference, facility_id, booking_date, start_time, end_time, customer_name, customer_contact) VALUES (?, ?, ?, ?, ADDTIME(?, SEC_TO_TIME(? * 60)), ?, ?)", [reference, input.facilityId, input.date, input.time, input.time, facility.slot_minutes, name, contact]);
      await connection.execute("INSERT INTO booking_slots (booking_id, facility_id, booking_date, start_time) VALUES (?, ?, ?, ?)", [result.insertId, input.facilityId, input.date, input.time]);
      return reference;
    });
    revalidatePath("/"); revalidatePath("/admin");
    return { ok:true, message:`Booking request ${reference} was submitted. The academy will contact you to confirm.` };
  } catch (error) {
    const code = (error as { code?:string }).code;
    return { ok:false, message:code === "ER_DUP_ENTRY" ? "That time slot was just booked. Please choose another." : error instanceof Error ? error.message : "Unable to submit the booking." };
  }
}
