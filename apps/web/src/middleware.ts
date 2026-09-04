import { auth } from "@/lib/auth/instance";

export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  // `/auth/continue` must be included so Neon Auth can exchange the OAuth
  // session verifier for cookies (callbackURL must not sit under `/login`).
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/landlord-portal/:path*",
    "/auth/continue",
  ],
};
