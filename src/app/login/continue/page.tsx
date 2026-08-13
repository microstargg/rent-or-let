import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { resolvePostLoginPath, safeNextPath } from "@/lib/auth/redirect";

export default async function LoginContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) redirect(`/login${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`);

  redirect(await resolvePostLoginPath(userId, safeNextPath(params.next)));
}
