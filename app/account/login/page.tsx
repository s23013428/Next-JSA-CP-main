import Link from "next/link";
import { LoginForm } from "../auth-form";
import styles from "../account.module.css";

export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams:Promise<{ next?:string }> }) {
  const nextPath = (await searchParams).next || "/account";
  return (
    <main className={styles.authPage}>
      <Link className={styles.authBrand} href="/"><span>J</span> JSA PLAY</Link>
      <section className={styles.authCard}>
        <div className={styles.authIntro}><span>Customer account</span><h1>Welcome back.</h1><p>Sign in to reserve a facility and manage your upcoming and previous bookings.</p></div>
        <LoginForm nextPath={nextPath} />
      </section>
      <Link className={styles.backLink} href="/">← Return to facility booking</Link>
    </main>
  );
}
