import { requireLandlordSession } from "@/lib/auth/server";
import {
  listPropertiesForLandlord,
  getLandlordBalance,
  listTickets,
} from "@/lib/db/queries";

export default async function LandlordPortalHome() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const landlordId = ctx.profile.profile.landlordId;
  const branchId = ctx.profile.profile.branchId;
  const props = await listPropertiesForLandlord(landlordId);
  const balance = await getLandlordBalance(landlordId);
  const tickets = await listTickets(branchId);
  const myTickets = tickets.filter((t) =>
    props.some((p) => p.id === t.ticket.propertyId)
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Welcome, {ctx.profile.landlord.firstName}
      </h1>
      <p className="mt-1 text-muted-foreground">Your properties and account</p>

      <div className="mt-6 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Balance due to you</p>
        <p className="text-2xl font-bold">£{balance.toFixed(2)}</p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Properties</h2>
        <div className="mt-3 space-y-2">
          {props.map((p) => (
            <div key={p.id} className="rounded-xl border p-3">
              <p className="font-medium">{p.displayAddress}</p>
              <p className="text-sm text-muted-foreground">
                £{Number(p.pricePcm).toFixed(0)} pcm · {p.status}
              </p>
            </div>
          ))}
          {!props.length && <p className="text-muted-foreground">No properties linked</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Open maintenance</h2>
        <div className="mt-3 space-y-2">
          {myTickets
            .filter((t) => !["completed", "cancelled"].includes(t.ticket.status))
            .slice(0, 10)
            .map(({ ticket, propertyAddress }) => (
              <div key={ticket.id} className="rounded-xl border p-3 text-sm">
                <p className="font-medium">{ticket.summary}</p>
                <p className="text-muted-foreground">
                  {propertyAddress} · {ticket.status}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
