"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginUser, registerUser, type UserAuthState } from "./actions";
import styles from "./account.module.css";

const initialState: UserAuthState = { error:"" };

export function LoginForm({ nextPath }: { nextPath:string }) {
  const [state, action, pending] = useActionState(loginUser, initialState);
  return (
    <form action={action} className={styles.authForm}>
      <input type="hidden" name="next" value={nextPath} />
      {state.error && <p className={styles.formError} role="alert">{state.error}</p>}
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></label>
      <button type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      <p>New to JSA Play? <Link href={`/account/register?next=${encodeURIComponent(nextPath)}`}>Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ nextPath }: { nextPath:string }) {
  const [state, action, pending] = useActionState(registerUser, initialState);
  return (
    <form action={action} className={styles.authForm}>
      <input type="hidden" name="next" value={nextPath} />
      {state.error && <p className={styles.formError} role="alert">{state.error}</p>}
      <label>Full name<input name="name" autoComplete="name" placeholder="Your full name" required /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+94 77 123 4567" required /></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" placeholder="Choose any password" required /></label>
      <button type="submit" disabled={pending}>{pending ? "Creating account..." : "Create account"}</button>
      <p>Already have an account? <Link href={`/account/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link></p>
    </form>
  );
}
