import Link from "next/link";
import { RegisterForm } from "../auth-form";
import styles from "../account.module.css";

export const instant = false;

export default async function RegisterPage({ searchParams }: { searchParams:Promise<{ next?:string }> }) {
  const nextPath = (await searchParams).next || "/account";
  return (
    <main className={styles.authPage}>
      <Link className={styles.authBrand} href="/"><span>J</span> JSA PLAY</Link>
      <section className={styles.authCard}>
        <div className={styles.authIntro}><span>Create your account</span><h1>Ready to play?</h1><p>Your account keeps every booking, status update, and cancellation deadline in one place.</p></div>
        <RegisterForm nextPath={nextPath} />
      </section>
      <Link className={styles.backLink} href="/">← Return to facility booking</Link>
    </main>
  );
}
