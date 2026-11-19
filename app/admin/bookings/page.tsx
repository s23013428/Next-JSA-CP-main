"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { BookingView } from "@/app/lib/types";
import { AdminShell } from "../admin-shell";
import { loadBookings, reviewBooking } from "../actions";
import styles from "../admin.module.css";

const filters = ["All", "Pending", "Confirmed", "Rejected", "Cancelled"] as const;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [admin, setAdmin] = useState({ name:"Administrator", email:"demo@gmail.com" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await loadBookings();
      setBookings(data.bookings); setAdmin(data.admin);
    });
  }, []);

  const visibleBookings = useMemo(() => filter === "All" ? bookings : bookings.filter((booking) => booking.status === filter), [bookings, filter]);

  function updateBooking(booking: BookingView, decision: "confirmed" | "rejected") {
    startTransition(async () => {
      const result = await reviewBooking(booking.id, decision);
      setMessage(result.message);
      if (result.ok) setBookings((items) => items.map((item) => item.id === booking.id ? { ...item, status:decision === "confirmed" ? "Confirmed" : "Rejected" } : item));
    });
  }

  function exportBookings() {
    const csv = ["Reference,Facility,Date and time,Customer,Contact,Status", ...visibleBookings.map((booking) => [booking.ref, booking.facility, booking.when, booking.customer, booking.contact, booking.status].map((value) => `"${value.replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "jsa-bookings.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <AdminShell admin={admin} active="bookings" eyebrow="Booking management" title="Bookings" description="Review every request and track its current status.">
      {message && <div className={styles.successNotice} role="status"><span>✓</span>{message}</div>}
      <section className={`${styles.panel} ${styles.fullPagePanel}`}>
        <header className={styles.panelHeader}>
          <div><span className={styles.panelKicker}>All requests</span><h2>Booking register</h2><p>{bookings.length} requests stored in the database.</p></div>
          <button className={styles.secondaryButton} type="button" onClick={exportBookings}>Export CSV</button>
        </header>
        <div className={styles.filterBar} aria-label="Filter bookings by status">
          {filters.map((item) => <button className={filter === item ? styles.filterActive : styles.filterButton} key={item} onClick={() => setFilter(item)} type="button">{item}<span>{item === "All" ? bookings.length : bookings.filter((booking) => booking.status === item).length}</span></button>)}
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.bookingTable}>
            <thead><tr><th>Reference</th><th>Facility</th><th>Date &amp; time</th><th>Customer</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {visibleBookings.map((booking) => <tr key={booking.id}>
                <td><span className={styles.bookingRef}>{booking.ref}</span></td><td><strong>{booking.facility}</strong></td><td><time dateTime={booking.when.replace(" ", "T")}>{booking.when}</time></td>
                <td><div className={styles.customer}><span className={styles.customerAvatar}>{booking.customer.slice(0,1).toUpperCase()}</span><span><strong>{booking.customer}</strong><small>{booking.contact}</small></span></div></td>
                <td><span className={`${styles.statusBadge} ${styles[`status${booking.status}`]}`}><i />{booking.status}</span></td>
                <td>{booking.status === "Pending" && <div className={styles.rowActions}><button className={styles.approveButton} disabled={isPending} onClick={() => updateBooking(booking, "confirmed")} type="button">Confirm</button><button className={styles.rejectButton} disabled={isPending} onClick={() => updateBooking(booking, "rejected")} type="button">Reject</button></div>}</td>
              </tr>)}
              {!isPending && visibleBookings.length === 0 && <tr><td colSpan={6}><div className={styles.emptyState}><span>✓</span><strong>No {filter.toLowerCase()} bookings</strong><p>Requests will appear here when they match this status.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
