"use client";

import { useEffect, useState, useTransition } from "react";
import { AdminShell } from "./admin-shell";
import { loadDashboard, reviewBooking } from "./actions";
import type { BookingView } from "@/app/lib/types";
import styles from "./admin.module.css";

function StatIcon({ type }: { type: "facilities" | "bookings" | "admins" }) {
  const paths = {
    facilities: <><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
    bookings: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 10h16M8 15h3" /></>,
    admins: <><circle cx="9" cy="8" r="4" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 11a4 4 0 0 1 5 4v2" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

export default function AdminDashboard() {
  const [pending, setPending] = useState<BookingView[]>([]);
  const [stats, setStats] = useState({ activeFacilities:0, readyFacilities:0, pendingBookings:0, activeAdmins:0 });
  const [admin, setAdmin] = useState({ name:"Administrator", email:"demo@gmail.com" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await loadDashboard();
      setPending(data.bookings);
      setStats(data.stats);
      setAdmin(data.admin);
    });
  }, []);

  function updateBooking(booking: BookingView, decision: "confirmed" | "rejected") {
    startTransition(async () => {
      const result = await reviewBooking(booking.id, decision);
      setMessage(result.message);
      if (result.ok) {
        setPending((items) => items.filter((item) => item.id !== booking.id));
        setStats((value) => ({ ...value, pendingBookings:Math.max(0, value.pendingBookings - 1) }));
      }
    });
  }

  return (
    <AdminShell
      admin={admin}
      active="overview"
      eyebrow="Operations overview"
      title="Good afternoon, Admin"
      description="Here is what is happening across JSA Play today."
    >
      <section className={styles.statGrid} aria-label="Operations summary">
        <article className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconRed}`}><StatIcon type="facilities" /></span>
          <div className={styles.statCopy}><span>Active facilities</span><strong>{stats.activeFacilities}</strong><small><b>{stats.readyFacilities} ready</b> for bookings</small></div>
          <span className={styles.statTrend}>Live</span>
        </article>
        <article className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}><StatIcon type="bookings" /></span>
          <div className={styles.statCopy}><span>Pending bookings</span><strong>{stats.pendingBookings}</strong><small>Waiting for review</small></div>
          <span className={styles.statTrendAttention}>Action</span>
        </article>
        <article className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}><StatIcon type="admins" /></span>
          <div className={styles.statCopy}><span>Registered admins</span><strong>{stats.activeAdmins}</strong><small><b>Database secured</b></small></div>
          <span className={styles.statTrend}>Secure</span>
        </article>
      </section>

      {message && <div className={styles.successNotice} role="status"><span>✓</span>{message}</div>}

      <section className={styles.dashboardGrid}>
        <article className={styles.panel} id="bookings">
          <header className={styles.panelHeader}>
            <div><span className={styles.panelKicker}>Needs your attention</span><h2>Booking requests</h2><p>Review and respond to new facility requests.</p></div>
            <button className={styles.secondaryButton} type="button">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4" /><path d="M5 21h14" /></svg>
              Export
            </button>
          </header>

          <div className={styles.tableWrap}>
            <table className={styles.bookingTable}>
              <thead><tr><th>Reference</th><th>Facility</th><th>Date &amp; time</th><th>Customer</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
              <tbody>
                {pending.map((booking) => (
                  <tr key={booking.ref}>
                    <td><span className={styles.bookingRef}>{booking.ref}</span></td>
                    <td><strong>{booking.facility}</strong></td>
                    <td><time dateTime={booking.when.replace(" ", "T")}>{booking.when}</time></td>
                    <td><div className={styles.customer}><span className={styles.customerAvatar}>{booking.customer.slice(0, 1).toUpperCase()}</span><span><strong>{booking.customer}</strong><small>{booking.contact}</small></span></div></td>
                    <td><span className={styles.pendingBadge}><i />{booking.status}</span></td>
                    <td><div className={styles.rowActions}><button className={styles.approveButton} type="button" disabled={isPending} onClick={() => updateBooking(booking, "confirmed")}>Confirm</button><button className={styles.rejectButton} type="button" disabled={isPending} onClick={() => updateBooking(booking, "rejected")}>Reject</button></div></td>
                  </tr>
                ))}
                {pending.length === 0 && <tr><td colSpan={6}><div className={styles.emptyState}><span>✓</span><strong>You are all caught up</strong><p>There are no pending booking requests.</p></div></td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <aside className={styles.activityPanel} aria-label="Operations status">
          <header><span className={styles.panelKicker}>At a glance</span><h2>Operations status</h2></header>
          <div className={styles.progressBlock}><div><span>Facility readiness</span><strong>{stats.activeFacilities ? Math.round((stats.readyFacilities / stats.activeFacilities) * 100) : 0}%</strong></div><div className={styles.progressTrack}><span style={{ width:`${stats.activeFacilities ? (stats.readyFacilities / stats.activeFacilities) * 100 : 0}%` }} /></div><small>{stats.readyFacilities} of {stats.activeFacilities} facilities ready</small></div>
          <div className={styles.activityList}>
            <div><span className={styles.activityIcon}>06</span><p><strong>First booking</strong><span>Badminton Court 1</span></p></div>
            <div><span className={styles.activityIcon}>{String(stats.pendingBookings).padStart(2, "0")}</span><p><strong>Requests pending</strong><span>Awaiting admin review</span></p></div>
            <div><span className={`${styles.activityIcon} ${styles.activityIconGreen}`}>OK</span><p><strong>System healthy</strong><span>All services online</span></p></div>
          </div>
          <a className={styles.viewSchedule} href="#schedule">View today&apos;s schedule</a>
        </aside>
      </section>
    </AdminShell>
  );
}
