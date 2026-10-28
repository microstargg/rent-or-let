/** Edge-safe helpers for the shared access code in front of demo.letflow.app. */

export const DEMO_ACCESS_COOKIE = "lf-demo-access";
export const DEMO_ACCESS_PATH = "/demo-access";
export const DEMO_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

/** Paths that must work before the code is entered: the gate itself, crons, and static assets. */
export function isDemoAccessExempt(pathname: string): boolean {
  return (
    pathname === DEMO_ACCESS_PATH ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/agencies/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/apple-icon.svg"
  );
}

export function demoAccessCode(): string | null {
  return process.env.DEMO_ACCESS_CODE?.trim() || null;
}

/** Cookie value for a code. Changing DEMO_ACCESS_CODE signs everyone out of the gate. */
export async function demoAccessToken(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`letflow-demo-access:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when the cookie matches the current code. No code configured means the demo stays shut. */
export async function hasDemoAccess(cookieValue: string | undefined): Promise<boolean> {
  const code = demoAccessCode();
  if (!code || !cookieValue) return false;
  return cookieValue === (await demoAccessToken(code));
}
