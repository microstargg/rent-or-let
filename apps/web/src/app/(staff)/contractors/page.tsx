import { getDefaultBranch, listContractors } from "@/lib/db/queries";
import { ContractorForm } from "@/components/admin/contractor-form";
import { ContractorDeleteButton } from "@/components/admin/contractor-delete-button";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
} from "@/components/admin/admin-page";

export default async function AdminContractorsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listContractors(branch.id) : [];

  return (
    <div>
      <AdminPageHeader
        title="Contractors"
        description="Trades you assign maintenance jobs to. Add them here to pick them on a ticket."
        actions={
          <AdminEntityDialog
            triggerLabel="Add contractor"
            title="Add contractor"
            description="Create a contractor you can assign jobs to."
          >
            <ContractorForm />
          </AdminEntityDialog>
        }
      />

      <AdminSection title="Contractors">
        {rows.length ? (
          <AdminTable headers={["Name", "Trade", "Email", "Phone", "Notes", "Actions"]}>
            {rows.map((contractor) => (
              <tr key={contractor.id}>
                <td className="px-4 py-3 font-medium">{contractor.name}</td>
                <td className="px-4 py-3 capitalize">{contractor.trade || "—"}</td>
                <td className="px-4 py-3">
                  {contractor.email ? (
                    <CopyTextButton value={contractor.email} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {contractor.phone ? (
                    <CopyTextButton value={contractor.phone} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                  {contractor.notes || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AdminEntityDialog
                      triggerLabel="Edit"
                      title="Edit contractor"
                      triggerVariant="ghost"
                      triggerSize="sm"
                    >
                      <ContractorForm
                        initial={{
                          id: contractor.id,
                          name: contractor.name,
                          trade: contractor.trade,
                          email: contractor.email,
                          phone: contractor.phone,
                          notes: contractor.notes,
                        }}
                      />
                    </AdminEntityDialog>
                    <ContractorDeleteButton id={contractor.id} name={contractor.name} />
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="No contractors yet"
            description="Add your plumbers, electricians and other trades so you can assign jobs to them."
          />
        )}
      </AdminSection>
    </div>
  );
}
