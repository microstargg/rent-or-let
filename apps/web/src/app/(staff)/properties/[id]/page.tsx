import Link from "next/link";
import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/db/queries";
import { listPropertyKeys } from "@/lib/db/queries/keys";
import { listViewingsForProperty, toViewingItem } from "@/lib/db/queries/viewings";
import { listActivity } from "@/lib/db/queries/activity";
import { getPropertyOverview } from "@/lib/db/queries/property-overview";
import { PropertyEditClient, PropertyHeaderActions } from "@/components/admin/property-edit-client";
import { AdminEmptyState, AdminSection, AdminTable, StatusBadge } from "@/components/admin/admin-page";
import { KeysRegister } from "@/components/admin/keys-register";
import { BookViewingForm, ViewingsList } from "@/components/admin/viewings-panel";
import { ActivityList } from "@/components/admin/activity-list";
import { PropertyCompliancePanel } from "@/components/admin/property-compliance-panel";
import { PropertyTabs, type PropertySummaryCard, type PropertyTab } from "@/components/admin/property-tabs";
import { listBranchRequirements } from "@/lib/db/queries/compliance";
import { propertyComplianceMeta, scoreRequirements, sortRequirements } from "@/lib/compliance/requirements";
import { complianceLabel } from "@/lib/portal-format";
import { REGISTER_WINDOWS } from "@/lib/compliance/register";
import { cn, formatCurrency } from "@/lib/utils";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

function ukDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ukDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pretty(s: string): string {
  const t = s.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

/** A small titled card used on the Overview tab. */
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

interface AttentionRow {
  key: string;
  label: string;
  detail: string;
  urgent: boolean;
  href?: string;
}

export default async function EditPropertyPage({ params, searchParams }: EditPropertyPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const property = await getPropertyById(id);
  if (!property) notFound();
  const [keys, viewingRows, activity, requirementRows, overview] = await Promise.all([
    listPropertyKeys(id),
    listViewingsForProperty(id),
    listActivity({ propertyId: id }, 30),
    listBranchRequirements(property.branch_id, { propertyIds: [id] }),
    getPropertyOverview(id),
  ]);
  const complianceMeta = propertyComplianceMeta(requirementRows[0]?.property.metadata);
  const requirements = sortRequirements(requirementRows[0]?.requirements ?? []);
  const score = scoreRequirements(requirements);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { currentTenancy: current, landlord } = overview;
  const viewings = viewingRows.map(toViewingItem);
  const upcomingViewings = viewings
    .filter((v) => new Date(v.scheduledAt) >= now && !v.outcome)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const keysOut = keys.filter((k) => k.holderType !== "office");
  const keysOverdue = keysOut.filter((k) => k.dueBack && k.dueBack < today);
  const complianceIssues = requirements.filter((r) => r.status !== "valid");
  const badCompliance = requirements.filter((r) => r.status === "expired" || r.status === "missing");
  const emergencies = overview.openTickets.filter((t) => t.isEmergency);
  const nextInspection = overview.inspections
    .filter((i) => !i.completedAt && i.scheduledAt && new Date(i.scheduledAt) >= now)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))[0];

  // Things to deal with, most urgent first. Shown on the Overview tab.
  const attention: AttentionRow[] = [
    ...emergencies.map((t) => ({
      key: `t-${t.id}`,
      label: t.summary,
      detail: `Emergency repair, reported ${ukDate(t.createdAt)}`,
      urgent: true,
      href: `/tickets/${t.id}`,
    })),
    ...(current && current.overdue > 0
      ? [
          {
            key: "arrears",
            label: `${formatCurrency(current.overdue)} rent overdue`,
            detail: current.renterName,
            urgent: true,
            href: `/tenancies/${current.id}`,
          },
        ]
      : []),
    ...complianceIssues.slice(0, 5).map((r) => ({
      key: `c-${r.key}`,
      label: complianceLabel(r.type),
      detail:
        r.status === "missing"
          ? "Missing"
          : r.status === "expired"
            ? `Expired ${ukDate(r.item?.expiresAt)}`
            : `Expires ${ukDate(r.item?.expiresAt ?? r.dueDate)}`,
      urgent: r.status !== "expiring",
    })),
    ...keysOverdue.map((k) => ({
      key: `k-${k.id}`,
      label: `${k.label} not returned`,
      detail: `With ${k.holderName ?? "someone"}, was due ${ukDate(k.dueBack)}`,
      urgent: true,
    })),
  ];

  const summary: PropertySummaryCard[] = [
    current
      ? {
          label: "Tenancy",
          value: current.renterName,
          hint: `Since ${ukDate(current.startDate)}${current.status === "notice_given" ? " · notice given" : ""}`,
          tone: current.status === "notice_given" ? "warning" : "neutral",
          tab: "tenancies",
        }
      : {
          label: "Tenancy",
          value: "Vacant",
          hint: property.available_from ? `Available ${ukDate(property.available_from)}` : "No current tenant",
          tone: "neutral",
          tab: "tenancies",
        },
    current
      ? {
          label: "Rent",
          value: current.overdue > 0 ? `${formatCurrency(current.overdue)} owed` : "Up to date",
          hint: `${formatCurrency(current.rent)} ${current.rentFrequency === "monthly" ? "pcm" : current.rentFrequency}`,
          tone: current.overdue > 0 ? "danger" : "success",
          tab: "tenancies",
        }
      : {
          label: "Asking rent",
          value: `${formatCurrency(property.price_pcm)} pcm`,
          hint: `Deposit ${formatCurrency(property.deposit)}`,
          tone: "neutral",
          tab: "listing",
        },
    {
      label: "Compliance",
      value: score.total ? `${score.score}%` : "Nothing due",
      hint: score.total
        ? [
            score.expired && `${score.expired} expired`,
            score.missing && `${score.missing} missing`,
            score.expiring && `${score.expiring} expiring`,
          ]
            .filter(Boolean)
            .join(", ") || "All in date"
        : "No checks apply",
      tone: score.expired || score.missing ? "danger" : score.expiring ? "warning" : "success",
      tab: "compliance",
    },
    {
      label: "Repairs",
      value: overview.openTickets.length ? `${overview.openTickets.length} open` : "None open",
      hint: emergencies.length
        ? plural(emergencies.length, "emergency", "emergencies")
        : overview.openTickets.length
          ? "Nothing urgent"
          : "All clear",
      tone: emergencies.length ? "danger" : overview.openTickets.length ? "warning" : "neutral",
      tab: "repairs",
    },
  ];

  const overviewTab = (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel title="Needs attention">
          {attention.length ? (
            <ul className="-mx-4 -my-3 divide-y">
              {attention.map((a) => {
                const inner = (
                  <>
                    <span className="block truncate text-sm font-medium">{a.label}</span>
                    <span className={cn("block truncate text-xs", a.urgent ? "text-red-700" : "text-amber-800")}>
                      {a.detail}
                    </span>
                  </>
                );
                return (
                  <li key={a.key}>
                    {a.href ? (
                      <Link href={a.href} className="block px-4 py-2.5 hover:bg-muted/40">
                        {inner}
                      </Link>
                    ) : (
                      <div className="px-4 py-2.5">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing needs doing on this property right now.</p>
          )}
        </Panel>

        <Panel
          title="Current tenancy"
          action={
            current ? (
              <Link href={`/tenancies/${current.id}`} className="text-xs font-medium text-primary hover:underline">
                Open tenancy
              </Link>
            ) : (
              <Link href="/tenancies" className="text-xs font-medium text-primary hover:underline">
                Tenancies
              </Link>
            )
          }
        >
          {current ? (
            <Facts
              rows={[
                ["Tenant", current.renterName],
                ...(current.renterPhone ? ([["Phone", current.renterPhone]] as [string, React.ReactNode][]) : []),
                ...(current.renterEmail ? ([["Email", current.renterEmail]] as [string, React.ReactNode][]) : []),
                ["Rent", `${formatCurrency(current.rent)} ${current.rentFrequency === "monthly" ? "pcm" : current.rentFrequency}`],
                ["Started", ukDate(current.startDate)],
                ["Ends", current.endDate ? ukDate(current.endDate) : "Rolling"],
                [
                  "Deposit",
                  current.deposit
                    ? `${formatCurrency(current.deposit)}${current.depositProtectedAt ? ", protected" : ", not protected yet"}`
                    : "None",
                ],
                ["Status", <StatusBadge key="s" status={current.status} />],
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No current tenancy. {overview.tenancies.length ? `${plural(overview.tenancies.length, "past tenancy", "past tenancies")} on the Tenancies tab.` : ""}
            </p>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Landlord">
          {landlord ? (
            <Facts
              rows={[
                ["Name", landlord.name],
                ...(landlord.phone ? ([["Phone", landlord.phone]] as [string, React.ReactNode][]) : []),
                ...(landlord.email ? ([["Email", landlord.email]] as [string, React.ReactNode][]) : []),
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No landlord linked. Pick one on the Listing tab.</p>
          )}
        </Panel>

        <Panel title="Coming up">
          <ul className="space-y-2 text-sm">
            {upcomingViewings.slice(0, 3).map((v) => (
              <li key={v.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">Viewing{v.viewer ? ` with ${v.viewer}` : ""}</span>
                <span className="shrink-0 text-muted-foreground">{ukDateTime(v.scheduledAt)}</span>
              </li>
            ))}
            {nextInspection && (
              <li className="flex justify-between gap-3">
                <Link href={`/inspections/${nextInspection.id}`} className="min-w-0 truncate hover:underline">
                  {pretty(nextInspection.type)} inspection
                </Link>
                <span className="shrink-0 text-muted-foreground">{ukDate(nextInspection.scheduledAt)}</span>
              </li>
            )}
            {current?.endDate && current.endDate >= today && (
              <li className="flex justify-between gap-3">
                <span>Tenancy ends</span>
                <span className="shrink-0 text-muted-foreground">{ukDate(current.endDate)}</span>
              </li>
            )}
            {keysOut.length > 0 && (
              <li className="flex justify-between gap-3">
                <span>{plural(keysOut.length, "key set")} out</span>
                <span className="shrink-0 text-muted-foreground">
                  {keysOverdue.length ? `${keysOverdue.length} overdue` : "none overdue"}
                </span>
              </li>
            )}
            {!upcomingViewings.length && !nextInspection && !keysOut.length && !(current?.endDate && current.endDate >= today) && (
              <li className="text-muted-foreground">No viewings, inspections or key loans booked.</li>
            )}
          </ul>
        </Panel>

        <Panel title="Property">
          <Facts
            rows={[
              ["Reference", property.agent_ref],
              ["Type", `${property.bedrooms} bed ${pretty(property.property_type).toLowerCase()}, ${plural(property.bathrooms, "bathroom")}`],
              ["Furnished", pretty(property.furnished)],
              ["Advertised rent", `${formatCurrency(property.price_pcm)} pcm`],
              ["Deposit", formatCurrency(property.deposit)],
              ["EPC", property.epc_rating ?? "Not set"],
              ["Listing", <StatusBadge key="s" status={property.status} />],
            ]}
          />
        </Panel>
      </div>
    </div>
  );

  const complianceTab = (
    <AdminSection
      title="Compliance"
      description="What this property needs by law, and what's on file. Add certificates on the Compliance page."
      className="mt-4"
    >
      <div className="rounded-xl border bg-card p-4">
        <PropertyCompliancePanel
          propertyId={id}
          gasSupply={complianceMeta.gasSupply !== false}
          licensing={complianceMeta.licensing ?? null}
          rows={requirements.map((r) => ({
            key: r.key,
            label: complianceLabel(r.type),
            reason: r.reason,
            status: r.status,
            expiresAt: r.item?.expiresAt ?? r.dueDate ?? null,
            tenancyLabel: r.tenancyId ? "current tenancy" : null,
            required: r.required,
          }))}
          register={(() => {
            const reg = requirementRows[0]?.register;
            return {
              region: reg?.region ?? null,
              regionGuessed: reg?.regionGuessed ?? false,
              regionLabel: reg?.region ? REGISTER_WINDOWS[reg.region].label : null,
              opens: reg?.opens ?? null,
              deadline: reg?.deadline ?? null,
              propertyNumber: reg?.propertyNumber ?? null,
              registeredAt: reg?.registeredAt ?? null,
              isLet: reg?.isLet ?? false,
              regions: Object.entries(REGISTER_WINDOWS).map(([value, w]) => ({ value, label: w.label })),
            };
          })()}
        />
      </div>
    </AdminSection>
  );

  const tenanciesTab = (
    <AdminSection
      title="Tenancies"
      description="Everyone who has rented this property, newest first."
      className="mt-4"
      actions={
        <Link href="/tenancies" className="text-sm font-medium text-primary hover:underline">
          All tenancies
        </Link>
      }
    >
      {overview.tenancies.length ? (
        <AdminTable headers={["Tenant", "Dates", "Rent", "Status"]}>
          {overview.tenancies.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3">
                <Link href={`/tenancies/${t.id}`} className="font-medium text-primary hover:underline">
                  {t.renterName}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {ukDate(t.startDate)} to {t.endDate ? ukDate(t.endDate) : "now"}
              </td>
              <td className="px-4 py-3">
                {formatCurrency(t.rent)} {t.rentFrequency === "monthly" ? "pcm" : t.rentFrequency}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={t.status} />
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <AdminEmptyState title="No tenancies yet" description="Tenancies set up for this property will show here." />
      )}
    </AdminSection>
  );

  const ticketTable = (rows: typeof overview.openTickets) => (
    <AdminTable headers={["Repair", "Reported", "Priority", "Status"]}>
      {rows.map((t) => (
        <tr key={t.id}>
          <td className="px-4 py-3">
            <Link href={`/tickets/${t.id}`} className="font-medium text-primary hover:underline">
              {t.summary}
            </Link>
          </td>
          <td className="px-4 py-3 text-muted-foreground">{ukDate(t.createdAt)}</td>
          <td className="px-4 py-3">
            {t.isEmergency ? <StatusBadge status="emergency" tone="danger" /> : t.priority ? pretty(t.priority) : "Normal"}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={t.status} />
          </td>
        </tr>
      ))}
    </AdminTable>
  );

  const repairsTab = (
    <>
      <AdminSection
        title="Open repairs"
        className="mt-4"
        actions={
          <Link href="/tickets" className="text-sm font-medium text-primary hover:underline">
            All repairs
          </Link>
        }
      >
        {overview.openTickets.length ? (
          ticketTable(overview.openTickets)
        ) : (
          <AdminEmptyState title="No open repairs" />
        )}
      </AdminSection>
      {overview.closedTickets.length > 0 && (
        <AdminSection title="Finished repairs">{ticketTable(overview.closedTickets)}</AdminSection>
      )}
      {overview.inspections.length > 0 && (
        <AdminSection title="Inspections">
          <AdminTable headers={["Inspection", "Booked for", "Status"]}>
            {overview.inspections.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <Link href={`/inspections/${i.id}`} className="font-medium text-primary hover:underline">
                    {pretty(i.type)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{i.scheduledAt ? ukDate(i.scheduledAt) : "Not booked"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={i.completedAt ? "completed" : "scheduled"} />
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminSection>
      )}
    </>
  );

  const keysTab = (
    <>
      <AdminSection title="Viewings" className="mt-4" actions={<BookViewingForm propertyId={id} askForViewer />}>
        <div className="rounded-xl border bg-card p-4">
          <ViewingsList viewings={viewings} empty="No viewings yet." />
        </div>
      </AdminSection>
      <AdminSection title="Keys" description="Who has which keys, and when they're due back.">
        <div className="rounded-xl border bg-card p-4">
          <KeysRegister
            propertyId={id}
            keys={keys.map((k) => ({
              id: k.id,
              label: k.label,
              keyCount: k.keyCount,
              holderType: k.holderType,
              holderName: k.holderName,
              outSince: k.outSince,
              dueBack: k.dueBack,
              notes: k.notes,
            }))}
          />
        </div>
      </AdminSection>
    </>
  );

  const tabs: PropertyTab[] = [
    { id: "overview", label: "Overview", content: overviewTab },
    { id: "listing", label: "Listing", content: <PropertyEditClient property={property} /> },
    {
      id: "compliance",
      label: "Compliance",
      count: complianceIssues.length,
      countTone: badCompliance.length ? "danger" : "warning",
      content: complianceTab,
    },
    { id: "tenancies", label: "Tenancies", count: overview.tenancies.length, content: tenanciesTab },
    {
      id: "repairs",
      label: "Repairs",
      count: overview.openTickets.length,
      countTone: emergencies.length ? "danger" : "warning",
      content: repairsTab,
    },
    {
      id: "viewings",
      label: "Viewings & keys",
      count: upcomingViewings.length + keysOverdue.length,
      countTone: keysOverdue.length ? "danger" : "neutral",
      content: keysTab,
    },
    {
      id: "activity",
      label: "Activity",
      content: (
        <AdminSection title="Activity" description="Changes made by your team, newest first." className="mt-4">
          <ActivityList entries={activity} />
        </AdminSection>
      ),
    },
  ];

  const occupancy = current ? "tenanted" : "vacant";

  return (
    <div>
      <Link href="/properties" className="text-sm text-muted-foreground hover:text-foreground">
        ← Properties
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{property.display_address}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <StatusBadge status={occupancy} tone={current ? "success" : "neutral"} />
            <StatusBadge status={property.status} />
            <span>{property.agent_ref}</span>
            <span aria-hidden>·</span>
            <span>
              {property.bedrooms} bed {pretty(property.property_type).toLowerCase()}
            </span>
            {landlord && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">Landlord: {landlord.name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PropertyHeaderActions property={property} />
        </div>
      </div>

      <PropertyTabs tabs={tabs} summary={summary} initialTab={tab} />
    </div>
  );
}
