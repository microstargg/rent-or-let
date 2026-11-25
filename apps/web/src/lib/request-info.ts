/** Caller IP and browser, for audit trails. Vercel sets x-forwarded-for. */
export function requestInfo(request: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return { ip, userAgent: request.headers.get("user-agent") };
}
