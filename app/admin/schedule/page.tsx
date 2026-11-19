"use client";

import { useEffect, useState, useTransition } from "react";
import type { ScheduleFacilityView } from "@/app/lib/types";
import { AdminShell } from "../admin-shell";
import { loadSchedule } from "../actions";
import styles from "../admin.module.css";

export default function SchedulePage() {
  const [date, setDate] = useState("");
  const [facilities, setFacilities] = useState<ScheduleFacilityView[]>([]);
  const [admin, setAdmin] = useState({ name:"Administrator", email:"demo@gmail.com" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Colombo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
    startTransition(async () => { setDate(today); const data = await loadSchedule(today); setFacilities(data.facilities); setAdmin(data.admin); });
  }, []);

  function refreshSchedule() {
    startTransition(async () => { const data = await loadSchedule(date); setFacilities(data.facilities); setAdmin(data.admin); });
  }

  const reservedCount = facilities.reduce((total, facility) => total + facility.slots.filter((slot) => slot.booking).length, 0);

  return (
    <AdminShell admin={admin} active="schedule" eyebrow="Daily operations" title="Schedule" description="See every facility and reserved time slot for a selected day.">
      <section className={styles.scheduleControls}>
        <label><span>Schedule date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <button className={styles.primaryButton} type="button" onClick={refreshSchedule} disabled={isPending}>{isPending ? "Loading..." : "View schedule"}</button>
        <div className={styles.scheduleSummary}><strong>{reservedCount}</strong><span>reserved slots</span></div>
      </section>
      <div className={styles.scheduleList}>
        {facilities.map((facility) => <article className={styles.scheduleCard} key={facility.id}>
          <header><div><span>{facility.sport}</span><h2>{facility.name}</h2></div><small>{facility.slots.filter((slot) => slot.booking).length} booked</small></header>
          <div className={styles.adminSlotGrid}>
            {facility.slots.map((slot) => <div className={slot.booking ? styles.adminSlotBooked : styles.adminSlotOpen} key={slot.time}>
              <strong>{slot.time}</strong>{slot.booking ? <><span>{slot.booking.customer}</span><small>{slot.booking.ref} · {slot.booking.status}</small></> : <span>Available</span>}
            </div>)}
          </div>
        </article>)}
        {!isPending && facilities.length === 0 && <div className={styles.emptyState}><span>!</span><strong>No active facilities</strong><p>Add an active facility to create a schedule.</p></div>}
      </div>
    </AdminShell>
  );
}
