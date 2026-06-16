import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { listAllProperties } from "@/lib/db/queries";
import type { PropertyStatus } from "@/types";

const statusColors: Record<PropertyStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  available: "bg-green-100 text-green-800",
  let_agreed: "bg-amber-100 text-amber-800",
  archived: "bg-red-100 text-red-800",
};

export default async function AdminPropertiesPage() {
  const properties = await listAllProperties();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Properties</h1>
        <Button asChild>
          <Link href="/admin/properties/new">Add property</Link>
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Address</th>
              <th className="px-4 py-3 text-left font-medium">Rent</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Ref</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id} className="border-b last:border-0">
                <td className="px-4 py-3">{property.displayAddress}</td>
                <td className="px-4 py-3">{formatCurrency(Number(property.pricePcm))}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusColors[property.status as PropertyStatus] ?? ""
                    }`}
                  >
                    {property.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{property.agentRef}</td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/properties/${property.id}`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {!properties.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No properties yet.{" "}
                  <Link href="/admin/properties/new" className="text-primary underline">
                    Add your first property
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
