"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { UserBookingView } from "@/app/lib/types";
import { cancelUserBooking, logoutUser } from "./actions";
import styles from "./account.module.css";

type User = { id:number; name:string; email:string; phone:string };

function BookingCard({ booking, onCancel, pending }: { booking:UserBookingView; onCancel:(id:number)=>void; pending:boolean }) {
  return (
    <article className={styles.bookingCard}>
      <div className={styles.bookingIcon}>{booking.sport.slice(0, 1)}</div>
      <div className={styles.bookingMain}>
        <span className={styles.sport}>{booking.sport}</span>
        <h3>{booking.facility}</h3>
        <p><strong>{booking.date}</strong> at <strong>{booking.time}</strong> · Ref {booking.reference}</p>
      </div>
      <div className={styles.bookingSide}>
        <span className={`${styles.status} ${styles[booking.status.toLowerCase()]}`}>{booking.status}</span>
        {booking.status !== "Cancelled" && booking.status !== "Rejected" && <small>Cancel before {booking.cancelBy}</small>}
        {booking.canCancel && <button type="button" disabled={pending} onClick={() => onCancel(booking.id)}>{pending ? "Cancelling..." : "Cancel booking"}</button>}
        {!booking.canCancel && !booking.isPast && booking.status !== "Cancelled" && booking.status !== "Rejected" && <small className={styles.closed}>Online cancellation closed</small>}
      </div>
    </article>
  );
}

export function AccountPanel({ user, initialBookings }: { user:User; initialBookings:UserBookingView[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const upcoming = bookings.filter((booking) => !booking.isPast && !["Cancelled", "Rejected"].includes(booking.status));
  const history = bookings.filter((booking) => booking.isPast || ["Cancelled", "Rejected"].includes(booking.status));

  function cancelBooking(id:number) {
    if (!window.confirm("Cancel this booking? The time slot will become available to other customers.")) return;
    setPendingId(id);
    startTransition(async () => {
      const result = await cancelUserBooking(id);
      setMessage(result.message);
      if (result.ok) setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status:"Cancelled", canCancel:false } : booking));
      setPendingId(null);
    });
  }

  return (
    <main className={styles.panelPage}>
      <header className={styles.panelHeader}>
        <Link className={styles.authBrand} href="/"><span>J</span> JSA PLAY</Link>
        <nav><Link href="/">Book a slot</Link><form action={logoutUser}><button type="submit">Log out</button></form></nav>
      </header>
      <section className={styles.panelHero}>
        <div><span>Customer dashboard</span><h1>Hello, {user.name.split(" ")[0]}.</h1><p>Track your requests, check their status, and manage eligible cancellations.</p></div>
        <div className={styles.profile}><small>Signed in as</small><strong>{user.name}</strong><span>{user.email}</span><span>{user.phone}</span></div>
      </section>
      <div className={styles.policy}><strong>15-minute cancellation policy</strong><p>You can cancel online until 15 minutes before your scheduled start time. After the deadline, please contact the academy for help.</p></div>
      {message && <p className={styles.panelMessage} role="status">{message}</p>}
      <section className={styles.bookingSection}>
        <div className={styles.sectionTitle}><div><span>Next up</span><h2>Upcoming bookings</h2></div><Link href="/">+ Book another slot</Link></div>
        <div className={styles.bookingList}>{upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} onCancel={cancelBooking} pending={isPending && pendingId === booking.id} />)}{upcoming.length === 0 && <div className={styles.empty}><strong>No upcoming bookings</strong><p>Choose a facility and reserve your next game.</p><Link href="/">View available slots</Link></div>}</div>
      </section>
      <section className={styles.bookingSection}>
        <div className={styles.sectionTitle}><div><span>Your records</span><h2>Booking history</h2></div></div>
        <div className={styles.bookingList}>{history.map((booking) => <BookingCard key={booking.id} booking={booking} onCancel={cancelBooking} pending={false} />)}{history.length === 0 && <div className={styles.empty}><strong>No previous bookings yet</strong><p>Your completed and cancelled bookings will appear here.</p></div>}</div>
      </section>
    </main>
  );
}
