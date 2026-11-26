import Link from "next/link";
import { listTenantApplications, listAllProperties } from "@/lib/db/queries";
import { ApplicationStatusSelect } from "@/components/admin/application-status-select";
import { ConvertApplicationButton } from "@/components/admin/convert-application-button";
import { ApplicationChecksForm } from "@/components/admin/application-checks-form";
import { REFERENCING_STATUSES } from "@/lib/tenancy/referencing";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminEmptyState, AdminPageHeader, AdminTable } from "@/components/admin/admin-page";
import { formatDay, formatMoney } from "@/lib/utils";
import { HOLDING_DEPOSIT_DEADLINE_DAYS, addDaysIso } from "@/lib/tenancy/deposits";

function holdingSummary(app: {
  holdingDepositAmount: string | null;
  holdingDepositPaidAt: string | null;
  holdingDepositOutcome: string | null;
}): { text: string; overdue: boolean } {
  const amount = app.holdingDepositAmount ? formatMoney(app.holdingDepositAmount) : null;
  if (!app.holdingDepositPaidAt) return { text: amount ? `${amount} asked for, not paid` : "None taken", overdue: false };
  if (app.holdingDepositOutcome) return { text: `${amount ?? "Deposit"} ${app.holdingDepositOutcome.replaceAll("_", " ")}`, overdue: false };
  const deadline = addDaysIso(app.holdingDepositPaidAt, HOLDING_DEPOSIT_DEADLINE_DAYS);
  const today = new Date().toISOString().slice(0, 10);
  return {
    text: `${amount ?? "Deposit"} held, decide by ${formatDay(deadline)}`,
    overdue: deadline < today,
  };
}

const PASSED = new Set(["passed", "passed_with_guarantor", "complete"]);

type NextStep =
  | { kind: "text"; text: string; tone?: "warn" | "muted" }
  | { kind: "convert" }
  | { kind: "tenancy"; id: string };

function nextStep(app: { status: string; referencingStatus: string | null; propertyId: string | null }, tenancyId?: string): NextStep {
  if (tenancyId) return { kind: "tenancy", id: tenancyId };
  if (app.status === "rejected") return { kind: "text", text: "Not going ahead", tone: "muted" };
  const ref = app.referencingStatus ?? "pending";
  if (ref === "failed") return { kind: "text", text: "Referencing failed: reject, or add a guarantor", tone: "warn" };
  if (app.status === "approved") {
    return app.propertyId ? { kind: "convert" } : { kind: "text", text: "Approved: link a property to convert", tone: "warn" };
  }
  if (PASSED.has(ref)) return { kind: "text", text: "Referencing passed: set status to Approved" };
  if (ref === "in_progress") return { kind: "text", text: "Waiting on the referencing provider", tone: "muted" };
  return { kind: "text", text: "Start referencing in Checks" };
}

export default async function AdminApplicationsPage() {
  const [rows, properties] = await Promise.all([listTenantApplications(), listAllProperties()]);
  const rentByProperty = new Map(properties.map((p) => [p.id, Number(p.pricePcm)]));

  return (
    <div>
      <AdminPageHeader
        title="Tenant applications"
        description="Applicants who've applied for a property. Run referencing and take a holding deposit in Checks, approve them, then convert to a tenancy. The holding deposit must be decided within 15 days of payment."
      />
      <div className="mt-6">
        {rows.length ? (
          <AdminTable headers={["Applicant", "Property", "Referencing", "Holding deposit", "Status", "Next step"]}>
            {rows.map(({ application, displayAddress }) => {
              const refData = (application.referenceData ?? {}) as Record<string, string | undefined>;
              const holding = holdingSummary(application);
              const refLabel =
                REFERENCING_STATUSES.find((s) => s.value === application.referencingStatus)?.label ??
                application.referencingStatus;
              const step = nextStep(application, refData.tenancyId);
              return (
                <tr key={application.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {application.firstName} {application.lastName}
                    </p>
                    <a href={`mailto:${application.email}`} className="block break-all text-sm text-muted-foreground hover:underline">
                      {application.email}
                    </a>
                    {application.phone && (
                      <a href={`tel:${application.phone}`} className="block text-sm text-primary hover:underline">
                        {application.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {application.propertyId ? (
                      <Link href={`/properties/${application.propertyId}`} className="hover:underline">
                        {displayAddress}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">General</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {refLabel}
                    {refData.provider && <span className="block text-xs text-muted-foreground">{refData.provider}</span>}
                  </td>
                  <td className={`px-4 py-3 text-sm ${holding.overdue ? "text-red-600" : ""}`}>{holding.text}</td>
                  <td className="px-4 py-3">
                    <ApplicationStatusSelect id={application.id} status={application.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      {step.kind === "tenancy" ? (
                        <Link href={`/tenancies/${step.id}`} className="text-sm font-medium text-primary hover:underline">
                          Converted: view tenancy
                        </Link>
                      ) : step.kind === "convert" ? (
                        <ConvertApplicationButton applicationId={application.id} />
                      ) : (
                        <p
                          className={`text-sm ${step.tone === "warn" ? "text-amber-700" : step.tone === "muted" ? "text-muted-foreground" : "font-medium"}`}
                        >
                          {step.text}
                        </p>
                      )}
                      {step.kind !== "tenancy" && application.status !== "rejected" && (
                        <AdminEntityDialog
                          triggerLabel="Checks"
                          triggerVariant="outline"
                          title={`${application.firstName} ${application.lastName}`}
                          description="Referencing and holding deposit."
                        >
                          <ApplicationChecksForm
                            applicationId={application.id}
                            monthlyRent={application.propertyId ? rentByProperty.get(application.propertyId) ?? null : null}
                            referencing={{
                              status: application.referencingStatus ?? "pending",
                              provider: refData.provider ?? "",
                              reference: refData.reference ?? "",
                              note: refData.note ?? "",
                            }}
                            holding={{
                              amount: application.holdingDepositAmount ?? "",
                              paidAt: application.holdingDepositPaidAt ?? "",
                              outcome: application.holdingDepositOutcome ?? "",
                              note: application.holdingDepositNote ?? "",
                            }}
                          />
                        </AdminEntityDialog>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <AdminEmptyState title="No applications yet" description="Applicants apply from a property's listing or the website." />
        )}
      </div>
    </div>
  );
}
