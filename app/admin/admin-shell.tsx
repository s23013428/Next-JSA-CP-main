"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "./actions";
import styles from "./admin.module.css";

type AdminSection = "overview" | "bookings" | "schedule" | "facilities" | "audit";

type AdminShellProps = {
  admin?: { name:string; email:string };
  active: AdminSection;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const navigation: Array<{ label: string; href: string; section: AdminSection }> = [
  { label: "Overview", href: "/admin", section: "overview" },
  { label: "Bookings", href: "/admin/bookings", section: "bookings" },
  { label: "Schedule", href: "/admin/schedule", section: "schedule" },
  { label: "Facilities", href: "/admin/facilities", section: "facilities" },
  { label: "Audit log", href: "/admin/audit", section: "audit" },
];

function NavIcon({ section }: { section: AdminSection }) {
  const paths: Record<AdminSection, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    bookings: <><path d="M8 3v3M16 3v3M4 9h16" /><rect x="4" y="5" width="16" height="16" rx="3" /><path d="m8 14 2 2 5-5" /></>,
    schedule: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    facilities: <><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
    audit: <><path d="M9 5h10M9 12h10M9 19h10" /><path d="m4 5 1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[section]}
    </svg>
  );
}

export function AdminShell({ admin = { name:"Administrator", email:"demo@gmail.com" }, active, eyebrow, title, description, children }: AdminShellProps) {
  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/admin">
          <span className={styles.brandMark}>J</span>
          <span className={styles.brandText}>JSA PLAY<small>Management</small></span>
        </Link>

        <nav className={styles.navigation} aria-label="Admin navigation">
          {navigation.map((item) => (
            <Link className={item.section === active ? styles.navActive : styles.navLink} href={item.href} key={item.section}>
              <span className={styles.navIcon}><NavIcon section={item.section} /></span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.systemStatus}>
            <span className={styles.statusDot} />
            <div><strong>All systems operational</strong><span>Management portal</span></div>
          </div>
          <form action={logout}>
            <button className={styles.logoutButton} type="submit">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4" /></svg>
              Log out
            </button>
          </form>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}><span>J</span> JSA PLAY</div>
          <div className={styles.topbarTools}>
            <button className={styles.iconButton} type="button" aria-label="Notifications">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.userProfile}>
              <span className={styles.avatar}>AD</span>
              <div><strong>{admin.name}</strong><span>{admin.email}</span></div>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <div className={styles.dateChip}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="3" /></svg>
              <span><small>Today</small>19 Nov 2026</span>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
