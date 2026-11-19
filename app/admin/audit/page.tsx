"use client";

import { useEffect, useState, useTransition } from "react";
import type { AuditLogView } from "@/app/lib/types";
import { AdminShell } from "../admin-shell";
import { loadAuditLog } from "../actions";
import styles from "../admin.module.css";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [admin, setAdmin] = useState({ name:"Administrator", email:"demo@gmail.com" });
  const [isPending, startTransition] = useTransition();
  useEffect(() => { startTransition(async () => { const data = await loadAuditLog(); setLogs(data.logs); setAdmin(data.admin); }); }, []);

  return (
    <AdminShell admin={admin} active="audit" eyebrow="System history" title="Audit log" description="Trace administrator changes across bookings and facilities.">
      <section className={`${styles.panel} ${styles.fullPagePanel}`}>
        <header className={styles.panelHeader}><div><span className={styles.panelKicker}>Latest activity</span><h2>Recorded actions</h2><p>The newest 200 database changes are shown below.</p></div></header>
        <div className={styles.auditList}>
          {logs.map((log) => <article key={log.id}><span className={styles.auditIcon}>✓</span><div><strong>{log.action.replaceAll(".", " ")}</strong><p>{log.admin} · {log.entity}</p>{log.details && <small>{log.details}</small>}</div><time>{log.createdAt}</time></article>)}
          {!isPending && logs.length === 0 && <div className={styles.emptyState}><span>✓</span><strong>No activity recorded yet</strong><p>Booking and facility changes will appear here.</p></div>}
        </div>
      </section>
    </AdminShell>
  );
}
