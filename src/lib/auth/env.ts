function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy it from Neon Console → Auth → Configuration and add it to .env.local`
    );
  }
  return value;
}

export const authEnv = {
  baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
  cookieSecret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
};
