import Link from "next/link";
import { getDefaultBranch, listEnquiries, listAllProperties } from "@/lib/db/queries";
import { listViewingDiary, toViewingItem } from "@/lib/db/queries/viewings";
import { EnquiryPipelineSelect, PIPELINE_STAGES } from "@/components/admin/enquiry-pipeline-select";
import { EnquiryBoard } from "@/components/admin/enquiry-board";
import { EnquiryAddForm } from "@/components/admin/enquiry-add-form";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination, PAGE_SIZE, listBaseHref } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminSection, AdminTable } from "@/components/admin/admin-page";
import { ViewingsList } from "@/components/admin/viewings-panel";
import { cn, formatDateTime, formatDay, humanize } from "@/lib/utils";

const OPEN_STAGES = new Set(["new", "viewing_booked", "application", "referencing", "offer"]);

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; stage?: string; property?: string; source?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "board" ? "board" : "list";
  const stage = sp.stage ?? "open";
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page) || 1);

  const branch = await getDefaultBranch();
  const [rows, diary, properties] = await Promise.all([
    listEnquiries(),
    branch ? listViewingDiary(branch.id) : [],
    listAllProperties(),
  ]);
  const now = Date.now();
  const toRecord = diary.filter((r) => r.viewing.scheduledAt.getTime() < now);
  const upcoming = diary.filter((r) => r.viewing.scheduledAt.getTime() >= now);

  const stageOf = (e: (typeof rows)[number]["enquiry"]) => e.pipelineStage ?? e.status;
  const sources = Array.from(new Set(rows.map((r) => r.enquiry.source))).sort();
  const enquiryProperties = Array.from(
    new Map(rows.filter((r) => r.enquiry.propertyId).map((r) => [r.enquiry.propertyId!, r.displayAddress ?? ""])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = rows.filter(({ enquiry, displayAddress }) => {
    // The board shows every stage, so the stage filter only applies to the list.
    if (view === "list" && stage !== "all") {
      if (stage === "open" ? !OPEN_STAGES.has(stageOf(enquiry)) : stageOf(enquiry) !== stage) return false;
    }
    if (sp.property && enquiry.propertyId !== sp.property) return false;
    if (sp.source && enquiry.source !== sp.source) return false;
    if (q) {
      const hay = `${enquiry.name} ${enquiry.email} ${enquiry.phone ?? ""} ${displayAddress ?? ""} ${enquiry.message}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const viewHref = (v: string) =>
    listBaseHref("/enquiries", { view: v === "board" ? "board" : null, stage: sp.stage, property: sp.property, source: sp.source, q: sp.q });

  return (
    <div>
      <AdminPageHeader
        title="Enquiries"
        description="Lettings pipeline and viewings."
        actions={
          <AdminEntityDialog triggerLabel="Add enquiry" title="Add enquiry" description="For phone calls, walk-ins and emails.">
            <EnquiryAddForm properties={properties.map((p) => ({ id: p.id, label: p.displayAddress }))} />
          </AdminEntityDialog>
        }
      />

      <AdminSection
        title="Viewings"
        description="The next two weeks. Viewers get a reminder the day before, and you can email feedback to the landlord afterwards."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Coming up</h3>
            <ViewingsList
              viewings={upcoming.map(toViewingItem)}
              showAddress
              empty="Nothing booked. Book from an enquiry below or from the property page."
            />
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Needs an outcome</h3>
            <ViewingsList viewings={toRecord.map(toViewingItem)} showAddress empty="All recorded." />
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Pipeline"
        actions={
          <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-sm" role="group" aria-label="View">
            {(["list", "board"] as const).map((v) => (
              <a
                key={v}
                href={viewHref(v)}
                aria-current={view === v ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1",
                  view === v ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "list" ? "List" : "Board"}
              </a>
            ))}
          </div>
        }
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <AdminListToolbar
              searchPlaceholder="Search name, phone, email or address"
              statusParam="stage"
              statusOptions={
                view === "list"
                  ? [{ value: "open", label: "Open" }, ...PIPELINE_STAGES]
                  : undefined
              }
              defaultStatus="open"
            />
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2">
            {view === "board" && <input type="hidden" name="view" value="board" />}
            {sp.stage && <input type="hidden" name="stage" value={sp.stage} />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <select aria-label="Property" name="property" defaultValue={sp.property ?? ""} className="h-9 max-w-52 rounded-md border bg-background px-2 text-sm">
              <option value="">Any property</option>
              {enquiryProperties.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select aria-label="Source" name="source" defaultValue={sp.source ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">Any source</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">
              Show
            </button>
          </form>
        </div>

        {view === "board" ? (
          <div className="mt-3">
            <EnquiryBoard
              enquiries={filtered.map(({ enquiry, displayAddress }) => ({
                id: enquiry.id,
                name: enquiry.name,
                phone: enquiry.phone,
                email: enquiry.email,
                property: displayAddress,
                stage: stageOf(enquiry),
                when: formatDay(enquiry.createdAt),
              }))}
            />
          </div>
        ) : pageRows.length ? (
          <div className="mt-3">
            <AdminTable headers={["Who", "Property", "Message", "Stage", "Received"]}>
              {pageRows.map(({ enquiry, displayAddress }) => (
                <tr key={enquiry.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{enquiry.name}</p>
                    {enquiry.phone && (
                      <a href={`tel:${enquiry.phone}`} className="block text-sm text-primary hover:underline">
                        {enquiry.phone}
                      </a>
                    )}
                    {enquiry.email && (
                      <a href={`mailto:${enquiry.email}`} className="block break-all text-sm text-muted-foreground hover:underline">
                        {enquiry.email}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {enquiry.propertyId ? (
                      <Link href={`/properties/${enquiry.propertyId}`} className="hover:underline">
                        {displayAddress}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    <p className="text-xs text-muted-foreground">{humanize(enquiry.source)}</p>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm">
                    {enquiry.message ? (
                      <p className="line-clamp-3" title={enquiry.message}>
                        {enquiry.message}
                      </p>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EnquiryPipelineSelect id={enquiry.id} stage={stageOf(enquiry)} propertyId={enquiry.propertyId} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(enquiry.createdAt)}</td>
                </tr>
              ))}
            </AdminTable>
            <AdminPagination
              page={page}
              total={filtered.length}
              baseHref={listBaseHref("/enquiries", { stage: sp.stage, property: sp.property, source: sp.source, q: sp.q })}
            />
          </div>
        ) : (
          <AdminEmptyState
            title={rows.length ? "Nothing matches" : "No enquiries yet"}
            description={rows.length ? "Try another stage or filter." : "Portal and website enquiries land here, or add one by hand."}
          />
        )}
      </AdminSection>
    </div>
  );
}
