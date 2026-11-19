"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { AdminShell } from "../admin-shell";
import { deleteFacility, loadFacilities, saveFacility } from "../actions";
import type { FacilityAdminView } from "@/app/lib/types";
import styles from "../admin.module.css";

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityAdminView[]>([]);
  const [admin, setAdmin] = useState({ name:"Administrator", email:"demo@gmail.com" });
  const [editingId, setEditingId] = useState<number>();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("Badminton");
  const [ground, setGround] = useState("Independent");
  const [rate, setRate] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await loadFacilities();
      setFacilities(data.facilities); setAdmin(data.admin);
    });
  }, []);

  function addFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveFacility({ id:editingId, name, sport, ground, rate });
      setMessage(result.message);
      if (result.ok) { setEditingId(undefined); setName(""); setSport("Badminton"); setGround("Independent"); setRate(""); const data = await loadFacilities(); setFacilities(data.facilities); }
    });
  }

  function editFacility(facility: FacilityAdminView) {
    setEditingId(facility.id); setName(facility.name); setSport(facility.sport); setGround(facility.ground); setRate(facility.rate.replace(/,/g, "")); setMessage("");
  }

  function removeFacility(id: number) {
    startTransition(async () => {
      const result = await deleteFacility(id); setMessage(result.message);
      if (result.ok) { const data = await loadFacilities(); setFacilities(data.facilities); }
    });
  }

  return (
    <AdminShell
      admin={admin}
      active="facilities"
      eyebrow="Facility management"
      title="Facilities"
      description="Manage courts, play areas and hourly booking rates."
    >
      <section className={styles.facilityPanel}>
        <header className={styles.facilityPanelHeader}>
          <div><span className={styles.panelKicker}>Inventory</span><h2>Active facilities</h2><p>Add new spaces or update the current facility list.</p></div>
          <span className={styles.facilityCount}>{facilities.length} active</span>
        </header>

        <form className={styles.facilityForm} onSubmit={addFacility}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Facility name" aria-label="Facility name" required />
          <select value={sport} onChange={(event) => setSport(event.target.value)} aria-label="Sport"><option>Badminton</option><option>Cricket</option><option>Football</option></select>
          <select value={ground} onChange={(event) => setGround(event.target.value)} aria-label="Ground type"><option>Independent</option><option>Shared turf</option></select>
          <input value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Rate per hour" aria-label="Rate per hour" required />
          <button className={styles.primaryButton} type="submit" disabled={isPending}>{editingId ? "Save changes" : "Add facility"}</button>
        </form>

        {message && <div className={styles.successNotice} role="status"><span>✓</span>{message}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.facilityTable}>
            <thead><tr><th>Facility</th><th>Sport</th><th>Ground</th><th>Rate (LKR)</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {facilities.map((facility) => (
                <tr key={facility.id}>
                  <td><strong className={styles.facilityName}>{facility.name}<small>Available for booking</small></strong></td>
                  <td>{facility.sport}</td>
                  <td>{facility.ground}</td>
                  <td>{facility.rate}</td>
                  <td><div className={styles.rowActions}><button className={styles.editButton} type="button" onClick={() => editFacility(facility)}>Edit</button><button className={styles.deleteButton} type="button" disabled={isPending} onClick={() => removeFacility(facility.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
