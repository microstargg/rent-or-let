import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let authInstance: NeonAuth | undefined;

function createAuth(): NeonAuth {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

  if (!baseUrl) {
    throw new Error(
      "Missing NEON_AUTH_BASE_URL. Copy it from Neon Console → Auth → Configuration and add it to .env.local or Vercel environment variables."
    );
  }
  if (!cookieSecret) {
    throw new Error(
      "Missing NEON_AUTH_COOKIE_SECRET. Generate one with openssl rand -base64 32 and add it to .env.local or Vercel environment variables."
    );
  }

  return createNeonAuth({
    baseUrl,
    cookies: {
      secret: cookieSecret,
      // lax so OAuth return + post-login redirects keep the session cookie
      sameSite: "lax",
    },
  });
}

function getAuth(): NeonAuth {
  if (!authInstance) authInstance = createAuth();
  return authInstance;
}

/** Edge-safe auth instance (no DB imports). Use this from middleware. */
export const auth = new Proxy({} as NeonAuth, {
  get(_target, prop) {
    const instance = getAuth();
    const value = instance[prop as keyof NeonAuth];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
