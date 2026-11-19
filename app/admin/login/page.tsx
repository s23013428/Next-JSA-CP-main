import Link from "next/link";
import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="eyebrow">JSA PLAY · MANAGEMENT</div>
        <h1 id="login-title">Admin sign in</h1>
        <p>Enter your administrator credentials to open the management dashboard.</p>
        <LoginForm />
        <Link className="login-back" href="/">
          Return to booking site
        </Link>
      </section>
    </main>
  );
}
