"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import type { ScheduleFacilityView } from "@/app/lib/types";
import { AdminShell } from "../admin-shell";
import { loadSchedule, saveScheduleBooking } from "../actions";
import styles from "../admin.module.css";

type ScheduleForm = {
  id?: number;
  facilityId: number;
  time: string;
  customer: string;
  contact: string;
  status: "pending" | "confirmed" | "cancelled";
};

export default function SchedulePage() {
  const [date, setDate] = useState("");
  const [facilities, setFacilities] = useState<ScheduleFacilityView[]>([]);
  const [admin, setAdmin] = useState({ name:"Administrator", email:"demo@gmail.com" });
  const [form, setForm] = useState<ScheduleForm | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Colombo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
    startTransition(async () => { setDate(today); const data = await loadSchedule(today); setFacilities(data.facilities); setAdmin(data.admin); });
  }, []);

  function refreshSchedule(targetDate = date) {
    startTransition(async () => { const data = await loadSchedule(targetDate); setFacilities(data.facilities); setAdmin(data.admin); });
  }

  function openNewEntry(facility = facilities[0], time?: string) {
    if (!facility) { setMessage("Add an active facility before creating a schedule entry."); return; }
    const firstOpenTime = time ?? facility.slots.find((slot) => !slot.booking)?.time;
    if (!firstOpenTime) { setMessage("There are no available slots for this facility on the selected date."); return; }
    setMessage("");
    setForm({ facilityId:facility.id, time:firstOpenTime, customer:"", contact:"", status:"confirmed" });
  }

  function openSlot(facility: ScheduleFacilityView, slot: ScheduleFacilityView["slots"][number]) {
    if (!slot.booking) { openNewEntry(facility, slot.time); return; }
    setMessage("");
    setForm({ id:slot.booking.id, facilityId:facility.id, time:slot.time, customer:slot.booking.customer, contact:slot.booking.contact, status:slot.booking.status.toLowerCase() as ScheduleForm["status"] });
  }

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    startTransition(async () => {
      const result = await saveScheduleBooking({ ...form, date });
      setMessage(result.message);
      if (result.ok) { setForm(null); const data = await loadSchedule(date); setFacilities(data.facilities); }
    });
  }

  const selectedFacility = facilities.find((facility) => facility.id === form?.facilityId);
  const selectableTimes = useMemo(() => selectedFacility?.slots.filter((slot) => !slot.booking || slot.booking.id === form?.id) ?? [], [selectedFacility, form?.id]);
  const reservedCount = facilities.reduce((total, facility) => total + facility.slots.filter((slot) => slot.booking).length, 0);

  return (
    <AdminShell admin={admin} active="schedule" eyebrow="Daily operations" title="Schedule" description="Create, edit and review every facility reservation for a selected day.">
      {message && <div className={styles.successNotice} role="status"><span>✓</span>{message}</div>}
      <section className={styles.scheduleControls}>
        <label><span>Schedule date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <button className={styles.secondaryButton} type="button" onClick={() => refreshSchedule()} disabled={isPending}>{isPending ? "Loading..." : "View schedule"}</button>
        <button className={styles.primaryButton} type="button" onClick={() => openNewEntry()} disabled={isPending || facilities.length === 0}>New schedule entry</button>
        <div className={styles.scheduleSummary}><strong>{reservedCount}</strong><span>reserved slots</span></div>
      </section>
      <p className={styles.scheduleHint}>Select any available slot to add a reservation, or select a booked slot to edit it.</p>
      <div className={styles.scheduleList}>
        {facilities.map((facility) => <article className={styles.scheduleCard} key={facility.id}>
          <header><div><span>{facility.sport}</span><h2>{facility.name}</h2></div><small>{facility.slots.filter((slot) => slot.booking).length} booked</small></header>
          <div className={styles.adminSlotGrid}>
            {facility.slots.map((slot) => <button className={slot.booking ? styles.adminSlotBooked : styles.adminSlotOpen} key={slot.time} onClick={() => openSlot(facility, slot)} type="button">
              <strong>{slot.time}</strong>{slot.booking ? <><span>{slot.booking.customer}</span><small>{slot.booking.ref} · {slot.booking.status}</small></> : <><span>Available</span><small>Add reservation</small></>}
            </button>)}
          </div>
        </article>)}
        {!isPending && facilities.length === 0 && <div className={styles.emptyState}><span>!</span><strong>No active facilities</strong><p>Add an active facility to create a schedule.</p></div>}
      </div>

      {form && selectedFacility && (
        <div className={styles.adminModalBackdrop} role="presentation" onClick={() => setForm(null)}>
          <form className={styles.adminModal} onSubmit={submitEntry} onClick={(event) => event.stopPropagation()}>
            <button className={styles.adminModalClose} type="button" onClick={() => setForm(null)} aria-label="Close schedule editor">×</button>
            <span className={styles.panelKicker}>{form.id ? "Edit reservation" : "New reservation"}</span>
            <h2>{form.id ? "Update schedule entry" : "Add to schedule"}</h2>
            <p>{date} · Slots are stored immediately in the booking database.</p>
            <div className={styles.adminModalGrid}>
              <label><span>Facility</span><select value={form.facilityId} onChange={(event) => { const facilityId = Number(event.target.value); const next = facilities.find((facility) => facility.id === facilityId); setForm({ ...form, facilityId, time:next?.slots.find((slot) => !slot.booking)?.time ?? "" }); }}>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
              <label><span>Time</span><select value={form.time} onChange={(event) => setForm({ ...form, time:event.target.value })}>{selectableTimes.map((slot) => <option key={slot.time} value={slot.time}>{slot.time}</option>)}</select></label>
            </div>
            <label><span>Customer name</span><input value={form.customer} onChange={(event) => setForm({ ...form, customer:event.target.value })} placeholder="Enter customer name" required /></label>
            <label><span>Phone or email</span><input value={form.contact} onChange={(event) => setForm({ ...form, contact:event.target.value })} placeholder="Customer contact details" required /></label>
            <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status:event.target.value as ScheduleForm["status"] })}><option value="confirmed">Confirmed</option><option value="pending">Pending</option>{form.id && <option value="cancelled">Cancelled</option>}</select></label>
            <button className={styles.primaryButton} type="submit" disabled={isPending || !form.time}>{isPending ? "Saving..." : form.id ? "Save changes" : "Add reservation"}</button>
            {form.id && <small className={styles.adminModalNote}>Choose Cancelled and save to release this time slot.</small>}
          </form>
        </div>
      )}
    </AdminShell>
  );
}
