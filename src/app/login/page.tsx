import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const params = await searchParams;

  const notice =
    params.registered === "1"
      ? "Account created. An admin must add your user ID to staff_profiles before you can access the admin area."
      : undefined;

  const error =
    params.error === "no-staff-access"
      ? "Your account is not authorized for admin access. Ask an admin to add you to staff_profiles."
      : params.error === "oauth"
        ? "Google sign-in failed or was cancelled. Try again or use email instead."
        : undefined;

  return <LoginForm notice={notice} error={error} />;
}
