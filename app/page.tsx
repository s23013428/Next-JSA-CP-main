"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkAvailability, createBooking } from "./actions";
import { getBookingViewer } from "./account/actions";
import type { FacilityView } from "./lib/types";
import styles from "./page.module.css";

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
  const router = useRouter();
  const [sport, setSport] = useState("All");
  const [date, setDate] = useState("");
  const [facilities, setFacilities] = useState<FacilityView[]>([]);
  const [selected, setSelected] = useState<{ facility: FacilityView; time: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [viewer, setViewer] = useState<{ id:number; name:string; email:string; phone:string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Colombo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
    startTransition(async () => {
      setDate(today);
      const [result, currentViewer] = await Promise.all([checkAvailability(today, "All"), getBookingViewer()]);
      if (result.ok) setFacilities(result.facilities);
      setViewer(currentViewer);
    });
  }, []);

  function chooseSlot(facility: FacilityView, slot: FacilityView["slots"][number]) {
    if (slot.status !== "Available") return;
    if (!viewer) {
      router.push("/account/login?next=/");
      return;
    }
    setSelected({ facility, time: slot.time });
    setNotice("");
  }

  function loadAvailability() {
    startTransition(async () => {
      const result = await checkAvailability(date, sport);
      setFacilities(result.facilities);
      setNotice(result.ok ? `Showing live availability for ${date}.` : result.message);
    });
  }

  function submitBooking() {
    if (!selected) return;
    startTransition(async () => {
      const result = await createBooking({ facilityId:selected.facility.id, date, time:selected.time });
      setNotice(result.message);
      if (result.requiresAuth) {
        router.push("/account/login?next=/");
        return;
      }
      if (result.ok) {
        setSelected(null);
        const availability = await checkAvailability(date, sport);
        if (availability.ok) setFacilities(availability.facilities);
      }
    });
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
            <Link href={viewer ? "/account" : "/account/login"}>{viewer ? "My bookings" : "Sign in"}</Link>
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
            <p className={styles.heroText}>Find an open court, choose your hour and reserve it from your JSA Play account in less than a minute.</p>
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
              <button className={styles.searchButton} type="button" onClick={loadAvailability} disabled={isPending}>{isPending ? "Checking..." : "Check availability"}</button>
            </div>
            <p className={styles.searchHint}><span>✓</span> Account required · Cancel until 15 minutes before start</p>
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
          {facilities.map((facility) => (
            <article className={styles.facilityCard} key={facility.id}>
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
                <div><a href={`https://wa.me/${facility.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a><a href="#details">Details</a><a href="#map">Map</a></div>
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
          {!isPending && facilities.length === 0 && <div className={styles.emptyState}>No facilities found for this sport.</div>}
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
            <div className={styles.bookingAccount}><small>Booking for</small><strong>{viewer?.name}</strong><span>{viewer?.phone || viewer?.email}</span></div>
            <div className={styles.cancellationAlert} role="note"><strong>15-minute cancellation policy</strong><span>You can cancel this booking from My bookings until 15 minutes before the scheduled start time. After that deadline, contact the academy.</span></div>
            <button className={styles.submitButton} type="button" onClick={submitBooking} disabled={isPending}>{isPending ? "Sending request..." : "Send booking request"}</button>
            <small className={styles.modalNote}>No payment is taken online. The academy will contact you to confirm.</small>
          </div>
        </div>
      )}
    </main>
  );
}
