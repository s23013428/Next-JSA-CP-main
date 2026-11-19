"use client";

import { type FormEvent, useState } from "react";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";

const initialFacilities = [
  { name: "Badminton Court 1", ground: "Independent", rate: "2,500" },
  { name: "Cricket Net 1", ground: "Shared turf", rate: "3,000" },
  { name: "Cricket Net 2", ground: "Shared turf", rate: "3,000" },
  { name: "Cricket Net 3", ground: "Shared turf", rate: "3,000" },
  { name: "Cricket Net 4", ground: "Shared turf", rate: "3,000" },
  { name: "Football Play Area", ground: "Shared turf", rate: "4,000" },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState(initialFacilities);
  const [name, setName] = useState("");
  const [ground, setGround] = useState("Independent");
  const [rate, setRate] = useState("");

  function addFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !rate.trim()) return;
    setFacilities([...facilities, { name: name.trim(), ground, rate: rate.trim() }]);
    setName("");
    setRate("");
  }

  return (
    <AdminShell
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
          <select value={ground} onChange={(event) => setGround(event.target.value)} aria-label="Ground type"><option>Independent</option><option>Shared turf</option></select>
          <input value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Rate per hour" aria-label="Rate per hour" required />
          <button className={styles.primaryButton} type="submit">Add facility</button>
        </form>

        <div className={styles.tableWrap}>
          <table className={styles.facilityTable}>
            <thead><tr><th>Facility</th><th>Ground</th><th>Rate (LKR)</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {facilities.map((facility, index) => (
                <tr key={`${facility.name}-${index}`}>
                  <td><strong className={styles.facilityName}>{facility.name}<small>Available for booking</small></strong></td>
                  <td>{facility.ground}</td>
                  <td>{facility.rate}</td>
                  <td><div className={styles.rowActions}><button className={styles.editButton} type="button">Edit</button><button className={styles.deleteButton} type="button" onClick={() => setFacilities(facilities.filter((_, itemIndex) => itemIndex !== index))}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
