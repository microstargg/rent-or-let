import Link from "next/link";
import { requireLandlordSession } from "@/lib/auth/server";
import {
  listPropertiesForLandlord,
  getLandlordBalance,
  listTicketsForLandlord,
  listComplianceItems,
} from "@/lib/db/queries";
import { computeComplianceStatus } from "@/lib/db/queries/compliance";
import { AdminEmptyState, AdminSection, AdminPageHeader, StatusBadge } from "@/components/admin/admin-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { complianceLabel, formatMoney } from "@/lib/portal-format";

export default async function LandlordPortalHome() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const { landlordId, branchId } = ctx.profile.profile;
  const [props, balance, tickets, compliance] = await Promise.all([
    listPropertiesForLandlord(landlordId),
    getLandlordBalance(landlordId),
    listTicketsForLandlord(landlordId),
    listComplianceItems(branchId),
  ]);

  const propIds = new Set(props.map((p) => p.id));
  const openTickets = tickets.filter(
    (t) => !["completed", "cancelled"].includes(t.ticket.status)
  );
  const complianceAlerts = compliance
    .filter((c) => propIds.has(c.item.propertyId))
    .map((c) => ({
      ...c,
      status: computeComplianceStatus(c.item.expiresAt, Boolean(c.item.documentId)),
    }))
    .filter((c) => c.status !== "valid")
    .sort((a, b) => (a.item.expiresAt ?? "").localeCompare(b.item.expiresAt ?? ""));

  const stats = [
    {
      label: "Balance due to you",
      value: formatMoney(balance),
      href: "/landlord-portal/statements",
      link: "View statements",
    },
    {
      label: "Properties",
      value: props.length,
      href: "#properties",
      link: "See below",
    },
    {
      label: "Open maintenance",
      value: openTickets.length,
      href: "#maintenance",
      link: "See below",
    },
    {
      label: "Compliance needing attention",
      value: complianceAlerts.length,
      href: "/landlord-portal/compliance",
      link: "View compliance",
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title={`Welcome, ${ctx.profile.landlord.firstName}`}
        description="Your properties, money and maintenance at a glance"
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, href, link }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
              <Button asChild variant="link" className="mt-2 h-auto p-0">
                <Link href={href}>{link}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {complianceAlerts.length > 0 && (
        <AdminSection
          title="Compliance needing attention"
          description="Certificates that are missing, expired or expire within 30 days"
        >
          <ul className="divide-y rounded-xl border bg-card">
            {complianceAlerts.slice(0, 5).map(({ item, propertyAddress, status }) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{complianceLabel(item.type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {propertyAddress}
                    {item.expiresAt ? ` · expires ${formatDate(item.expiresAt)}` : ""}
                  </p>
                </div>
                <StatusBadge status={status} />
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      <div id="properties" className="scroll-mt-20">
        <AdminSection title="Properties">
          {props.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {props.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.displayAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(p.pricePcm)} pcm · {p.bedrooms} bed {p.propertyType.replaceAll("_", " ")}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmptyState
              title="No properties linked yet"
              description="Your agent will link your properties to this account."
            />
          )}
        </AdminSection>
      </div>

      <div id="maintenance" className="scroll-mt-20">
        <AdminSection title="Open maintenance" description="Repairs reported on your properties">
          {openTickets.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {openTickets.slice(0, 10).map(({ ticket, propertyAddress }) => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{ticket.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {propertyAddress} · reported {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmptyState title="No open maintenance" description="Nothing needs fixing right now." />
          )}
        </AdminSection>
      </div>
    </div>
  );
}
