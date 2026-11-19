import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in | JSA Play",
  description: "Secure access to the JSA Play management dashboard.",
};

export default function AdminLoginPage() {
  return (
    <main className="login-shell">
      <div className="login-frame">
        <section className="login-story" aria-label="JSA Play management portal">
          <Link className="login-brand" href="/">
            <span className="login-brand-mark">J</span>
            <span>JSA PLAY</span>
          </Link>

          <div className="login-story-copy">
            <span className="login-kicker">MANAGEMENT PORTAL</span>
            <h2>Keep every court, booking and match on track.</h2>
            <p>
              One focused workspace for the team managing Jaffna Sports Academy.
            </p>
            <ul className="login-benefits">
              <li><span aria-hidden="true">✓</span> Review booking requests</li>
              <li><span aria-hidden="true">✓</span> Manage facilities and schedules</li>
              <li><span aria-hidden="true">✓</span> Monitor daily operations</li>
            </ul>
          </div>

          <p className="login-story-footer">JAFFNA SPORTS ACADEMY</p>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-heading">
            <span className="login-panel-icon" aria-hidden="true">J</span>
            <div>
              <span className="login-kicker">ADMIN ACCESS</span>
              <h1 id="login-title">Welcome back</h1>
            </div>
          </div>
          <p className="login-intro">
            Sign in with your administrator account to continue to the dashboard.
          </p>

          <LoginForm />

          <div className="login-footer-row">
            <span className="login-security"><span aria-hidden="true">●</span> Secure admin session</span>
            <Link className="login-back" href="/">Booking site</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
