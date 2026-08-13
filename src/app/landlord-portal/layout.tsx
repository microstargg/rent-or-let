import { redirect } from "next/navigation";
import Link from "next/link";
import { requireLandlordSession } from "@/lib/auth/server";
import {
  listPropertiesForLandlord,
  listLandlordStatements,
  listComplianceItems,
  getLandlordBalance,
} from "@/lib/db/queries";

export default async function LandlordPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireLandlordSession();
  if (!ctx) redirect("/login?next=/landlord-portal");

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/landlord-portal" className="font-bold text-primary">
            Landlord portal
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/landlord-portal">Overview</Link>
            <Link href="/landlord-portal/statements">Statements</Link>
            <Link href="/landlord-portal/compliance">Compliance</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
