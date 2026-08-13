import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string; next?: string }>;
}) {
  const params = await searchParams;

  const notice =
    params.registered === "1"
      ? "Account created. If you are staff, an admin must add you before you can access the office. Landlords and tenants use a portal invite."
      : undefined;

  const error =
    params.error === "no-staff-access"
      ? "Your account is not authorized for admin access. Landlords should open the landlord portal; tenants the renter portal."
      : params.error === "no-access"
        ? "Your account is not linked to staff, landlord, or renter access yet. Ask the office to send a portal invite."
      : params.error === "oauth"
        ? "Google sign-in failed or was cancelled. Try again or use email instead."
        : undefined;

  return <LoginForm notice={notice} error={error} next={params.next} />;
}
