import "server-only";

export const ADMIN_SESSION_COOKIE = "jsa_admin_session";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "demo@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "123456";

export function hasValidAdminCredentials(email: string, password: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export async function getAdminSessionToken() {
  const value = `${ADMIN_EMAIL}:${ADMIN_PASSWORD}:jsa-play-admin`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
