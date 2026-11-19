"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "../actions";

const initialState: LoginState = { error: "" };

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button login-button" type="submit" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="login-form">
      <label className="login-field" htmlFor="email">
        <span>Email address</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          required
          autoFocus
        />
      </label>
      <label className="login-field" htmlFor="password">
        <span>Password</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>
      {state.error && (
        <p className="login-error" role="alert">
          {state.error}
        </p>
      )}
      <LoginButton />
    </form>
  );
}
