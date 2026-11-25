import { listTenantApplications, listAllProperties } from "@/lib/db/queries";
import { ApplicationStatusSelect } from "@/components/admin/application-status-select";
import { ConvertApplicationButton } from "@/components/admin/convert-application-button";
import { ApplicationChecksForm } from "@/components/admin/application-checks-form";
import { REFERENCING_STATUSES } from "@/lib/tenancy/referencing";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminTable } from "@/components/admin/admin-page";
import { HOLDING_DEPOSIT_DEADLINE_DAYS, addDaysIso } from "@/lib/tenancy/deposits";

function holdingSummary(app: {
  holdingDepositAmount: string | null;
  holdingDepositPaidAt: string | null;
  holdingDepositOutcome: string | null;
}): { text: string; overdue: boolean } {
  if (!app.holdingDepositPaidAt) return { text: app.holdingDepositAmount ? `£${app.holdingDepositAmount} requested` : "—", overdue: false };
  if (app.holdingDepositOutcome) return { text: `£${app.holdingDepositAmount ?? "?"} ${app.holdingDepositOutcome}`, overdue: false };
  const deadline = addDaysIso(app.holdingDepositPaidAt, HOLDING_DEPOSIT_DEADLINE_DAYS);
  const today = new Date().toISOString().slice(0, 10);
  return {
    text: `£${app.holdingDepositAmount ?? "?"} held, deadline ${new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-GB")}`,
    overdue: deadline < today,
  };
}

export default async function AdminApplicationsPage() {
  const [rows, properties] = await Promise.all([listTenantApplications(), listAllProperties()]);
  const rentByProperty = new Map(properties.map((p) => [p.id, Number(p.pricePcm)]));

  return (
    <div>
      <h1 className="text-3xl font-bold">Tenant applications</h1>
      <div className="mt-6">
        <AdminTable headers={["Applicant", "Email", "Property", "Referencing", "Holding deposit", "Status", "Actions"]}>
          {rows.map(({ application, displayAddress }) => {
            const refData = (application.referenceData ?? {}) as Record<string, string | undefined>;
            const holding = holdingSummary(application);
            const refLabel =
              REFERENCING_STATUSES.find((s) => s.value === application.referencingStatus)?.label ??
              application.referencingStatus;
            return (
              <tr key={application.id}>
                <td className="px-4 py-3">
                  {application.firstName} {application.lastName}
                </td>
                <td className="px-4 py-3">{application.email}</td>
                <td className="px-4 py-3">{displayAddress ?? "General"}</td>
                <td className="px-4 py-3">
                  {refLabel}
                  {refData.provider && <span className="block text-xs text-muted-foreground">{refData.provider}</span>}
                </td>
                <td className={`px-4 py-3 text-sm ${holding.overdue ? "text-red-600" : ""}`}>{holding.text}</td>
                <td className="px-4 py-3">
                  <ApplicationStatusSelect id={application.id} status={application.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
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
                    {application.propertyId && application.status !== "approved" && (
                      <ConvertApplicationButton applicationId={application.id} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </AdminTable>
      </div>
    </div>
  );
}
