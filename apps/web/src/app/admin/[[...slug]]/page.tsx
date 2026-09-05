import { redirect } from "next/navigation";

export default async function LegacyAdminRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  redirect(slug?.length ? `/${slug.join("/")}` : "/");
}
