"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Slot = {
  time: string;
  status: "Available" | "Booked" | "Maintenance";
};

type Facility = {
  name: string;
  sport: string;
  rate: string;
  description: string;
  ground: string;
  slots: Slot[];
};

const slots = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

const facilities: Facility[] = [
  {
    name: "Badminton Court 1",
    sport: "Badminton",
    rate: "LKR 2,500 / hour",
    description: "Jaffna Sports Academy, Jaffna",
    ground: "Independent indoor court",
    slots: slots.map((time, index) => ({ time, status: index === 3 || index === 9 ? "Booked" : "Available" })),
  },
  {
    name: "Cricket Net 1",
    sport: "Cricket",
    rate: "LKR 3,000 / hour",
    description: "Jaffna Sports Academy, Jaffna",
    ground: "Shared turf · book any cricket net for this time slot",
    slots: slots.map((time, index) => ({ time, status: index === 5 ? "Booked" : "Available" })),
  },
  {
    name: "Football Play Area",
    sport: "Football",
    rate: "LKR 4,000 / hour",
    description: "Jaffna Sports Academy, Jaffna",
    ground: "Shared turf · football bookings reserve the cricket nets",
    slots: slots.map((time, index) => ({ time, status: index === 2 || index === 10 ? "Booked" : "Available" })),
  },
];

function SportIcon({ sport }: { sport: string }) {
  if (sport === "Badminton") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m7 3 10 10M5 8l5-5 5 5-5 5z" /><path d="m14 14 4 4M16 12l5 5-4 4-5-5" /></svg>;
  }

  if (sport === "Cricket") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m7 3 4 1 5 13-4 2L7 3Z" /><path d="M14 20h7M18 16v4M21 16v4" /><circle cx="5" cy="17" r="2" /></svg>;
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m9 4 3 3 3-3M4 10l4 2-1 4M20 10l-4 2 1 4M9 20l1-4h4l1 4" /></svg>;
}

export default function Home() {
  const [sport, setSport] = useState("All");
  const [date, setDate] = useState("2026-10-09");
  const [selected, setSelected] = useState<{ facility: Facility; time: string } | null>(null);
  const [notice, setNotice] = useState("");

  const visibleFacilities = sport === "All" ? facilities : facilities.filter((facility) => facility.sport === sport);

  function chooseSlot(facility: Facility, slot: Slot) {
    if (slot.status !== "Available") return;
    setSelected({ facility, time: slot.time });
    setNotice("");
  }

  function submitBooking() {
    setNotice(`Booking request for ${selected?.facility.name} at ${selected?.time} has been submitted.`);
    setSelected(null);
  }

  return (
    <main className={styles.siteShell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark}>J</span>
            <span>JSA PLAY<small>Jaffna Sports Academy</small></span>
          </Link>
          <nav className={styles.navigation} aria-label="Main navigation">
            <a className={styles.navActive} href="#availability">Book a slot</a>
            <a href="#facilities">Facilities</a>
            <Link className={styles.adminLink} href="/admin">Admin login</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero} id="availability">
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.heroBadge}><i /> Open daily · 6:00–20:00</span>
            <p className={styles.kicker}>Jaffna Sports Academy</p>
            <h1>Your next game<br />starts here.</h1>
            <p className={styles.heroText}>Find an open court, choose your hour and send a booking request in less than a minute. No account required.</p>
            <div className={styles.heroFacts}>
              <span><strong>3</strong> sports</span>
              <span><strong>14</strong> daily slots</span>
              <span><strong>1 min</strong> to request</span>
            </div>
          </div>

          <div className={styles.searchCard}>
            <div className={styles.searchHeading}><span>Check availability</span><small>Choose your preferred sport and date</small></div>
            <div className={styles.searchControls}>
              <label>
                <span>Sport</span>
                <div className={styles.controlWrap}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8 4 4 4 4-4M4 11l4 3-2 4M20 11l-4 3 2 4" /></svg>
                  <select value={sport} onChange={(event) => setSport(event.target.value)}>
                    <option>All</option><option>Badminton</option><option>Cricket</option><option>Football</option>
                  </select>
                </div>
              </label>
              <label>
                <span>Date</span>
                <div className={styles.controlWrap}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="3" /></svg>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
              </label>
              <button className={styles.searchButton} type="button" onClick={() => setNotice(`Showing availability for ${date}.`)}>Check availability</button>
            </div>
            <p className={styles.searchHint}><span>✓</span> Free cancellation before confirmation</p>
          </div>
        </div>
      </section>

      <section className={styles.facilitiesSection} id="facilities" aria-label="Facilities">
        <header className={styles.sectionHeader}>
          <div><span className={styles.sectionKicker}>Available today</span><h2>Choose your facility</h2><p>Select any green time slot to start your booking request.</p></div>
          <div className={styles.legend}><span><i className={styles.availableDot} />Available</span><span><i className={styles.bookedDot} />Booked</span></div>
        </header>

        {notice && <div className={styles.notice} role="status"><span>✓</span>{notice}</div>}

        <div className={styles.facilityList}>
          {visibleFacilities.map((facility) => (
            <article className={styles.facilityCard} key={facility.name}>
              <header className={styles.facilityHeader}>
                <div className={styles.facilityIdentity}>
                  <span className={styles.sportIcon}><SportIcon sport={facility.sport} /></span>
                  <div><span className={styles.sportLabel}>{facility.sport}</span><h3>{facility.name}</h3><p>{facility.description}</p></div>
                </div>
                <div className={styles.facilityMeta}>
                  <strong>{facility.rate}</strong>
                  <span className={styles.openBadge}><i /> Open today</span>
                </div>
              </header>

              <div className={styles.facilityToolbar}>
                <p><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5 7-12a7 7 0 0 0-14 0c0 7 7 12 7 12Z" /><circle cx="12" cy="9" r="2" /></svg>{facility.ground}</p>
                <div><a href="https://wa.me/94772234567" target="_blank" rel="noreferrer">WhatsApp</a><a href="#details">Details</a><a href="#map">Map</a></div>
              </div>

              <div className={styles.slotGrid}>
                {facility.slots.map((slot) => (
                  <button className={`${styles.slot} ${styles[slot.status.toLowerCase()]}`} disabled={slot.status !== "Available"} key={slot.time} onClick={() => chooseSlot(facility, slot)} type="button">
                    <strong>{slot.time}</strong><span>{slot.status}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
          {visibleFacilities.length === 0 && <div className={styles.emptyState}>No facilities found for this sport.</div>}
        </div>
      </section>

      <section className={styles.helpStrip}>
        <div><span className={styles.helpIcon}>?</span><div><strong>Need help choosing a facility?</strong><p>Our team can help you find the right court and time.</p></div></div>
        <a href="tel:+94772234567">Call +94 77 223 4567</a>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.footerBrand} href="/"><span>J</span> JSA PLAY</Link>
        <p>Simple sports facility booking for everyone in Jaffna.</p>
        <span>© 2026 Jaffna Sports Academy</span>
      </footer>

      {selected && (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setSelected(null)}>
          <div className={styles.bookingModal} role="dialog" aria-modal="true" aria-labelledby="booking-title" onClick={(event) => event.stopPropagation()}>
            <button className={styles.modalClose} type="button" onClick={() => setSelected(null)} aria-label="Close booking dialog">×</button>
            <span className={styles.modalIcon}><SportIcon sport={selected.facility.sport} /></span>
            <span className={styles.sectionKicker}>Booking request</span>
            <h2 id="booking-title">{selected.facility.name}</h2>
            <div className={styles.bookingSummary}><span><small>Date</small>{date}</span><span><small>Time</small>{selected.time}</span><span><small>Rate</small>{selected.facility.rate}</span></div>
            <label className={styles.modalLabel}>Your name<input placeholder="Enter your name" /></label>
            <label className={styles.modalLabel}>Phone or email<input placeholder="How can we contact you?" /></label>
            <button className={styles.submitButton} type="button" onClick={submitBooking}>Send booking request</button>
            <small className={styles.modalNote}>No payment is taken online. The academy will contact you to confirm.</small>
          </div>
        </div>
      )}
    </main>
  );
}
