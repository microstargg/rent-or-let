import { listPortalSyncLogs, getDefaultBranch } from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalSettings } from "@/components/admin/portal-settings";
import { PortalConnectionTest } from "@/components/admin/portal-connection-test";
import { AdminPageHeader, AdminSection, AdminTable } from "@/components/admin/admin-page";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

const PORTAL_NAME: Record<string, string> = { rightmove: "Rightmove", otm: "OnTheMarket", onthemarket: "OnTheMarket" };

export default async function AdminPortalsPage() {
  const [allLogs, branch] = await Promise.all([listPortalSyncLogs(1000), getDefaultBranch()]);
  const logs = allLogs.slice(0, 50);

  // What's live: the newest successful send or remove for each property on each portal.
  const latest = new Map<string, (typeof allLogs)[number]>();
  for (const row of allLogs) {
    if (row.log.status !== "success") continue;
    const key = `${row.log.portal}:${row.log.propertyId}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  const live = (portal: string) =>
    [...latest.values()]
      .filter((r) => r.log.portal === portal && r.log.action === "send")
      .sort((a, b) => (a.displayAddress ?? "").localeCompare(b.displayAddress ?? ""));
  const liveRightmove = live("rightmove");
  const liveOtm = live("onthemarket");

  const rightmoveConfigured = Boolean(
    process.env.RIGHTMOVE_NETWORK_ID && process.env.RIGHTMOVE_CERT_PEM
  );
  const otmConfigured = Boolean(process.env.OTM_NETWORK_ID && process.env.OTM_CERT_PEM);

  return (
    <div>
      <AdminPageHeader title="Portal sync" description="Send your available properties to Rightmove and OnTheMarket automatically." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rightmove</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Login details:{" "}
              <span className={rightmoveConfigured ? "text-green-600" : "text-amber-600"}>
                {rightmoveConfigured ? "Received" : "Not received yet"}
              </span>
            </p>
            <p>
              Sync:{" "}
              <span className={branch?.rightmoveSyncEnabled ? "text-green-600" : "text-muted-foreground"}>
                {branch?.rightmoveSyncEnabled ? "On" : "Off"}
              </span>
            </p>
            <p>
              Live now: <span className="font-medium">{liveRightmove.length}</span>{" "}
              {liveRightmove.length === 1 ? "property" : "properties"}
            </p>
            {!rightmoveConfigured && (
              <p className="text-muted-foreground">Waiting for Rightmove to send your feed login details.</p>
            )}
            {branch?.rightmoveBranchId && (
              <p className="text-muted-foreground">Rightmove branch number: {branch.rightmoveBranchId}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OnTheMarket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Login details:{" "}
              <span className={otmConfigured ? "text-green-600" : "text-amber-600"}>
                {otmConfigured ? "Received" : "Not received yet"}
              </span>
            </p>
            <p>
              Sync:{" "}
              <span className={branch?.otmSyncEnabled ? "text-green-600" : "text-muted-foreground"}>
                {branch?.otmSyncEnabled ? "On" : "Off"}
              </span>
            </p>
            <p>
              Live now: <span className="font-medium">{liveOtm.length}</span>{" "}
              {liveOtm.length === 1 ? "property" : "properties"}
            </p>
            {!otmConfigured && (
              <p className="text-muted-foreground">Waiting for OnTheMarket to send your feed login details.</p>
            )}
            {branch?.otmBranchId && (
              <p className="text-muted-foreground">OnTheMarket branch number: {branch.otmBranchId}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {branch && (
        <PortalSettings
          branch={{
            rightmove_sync_enabled: branch.rightmoveSyncEnabled,
            otm_sync_enabled: branch.otmSyncEnabled,
          }}
          rightmoveConfigured={rightmoveConfigured}
          otmConfigured={otmConfigured}
        />
      )}

      <PortalConnectionTest />

      <AdminSection title="Live on the portals" description="Properties whose latest update reached the portal.">
        {liveRightmove.length || liveOtm.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Rightmove", rows: liveRightmove },
              { name: "OnTheMarket", rows: liveOtm },
            ].map(({ name, rows }) => (
              <div key={name} className="rounded-xl border bg-card">
                <h3 className="border-b px-4 py-2.5 text-sm font-semibold">
                  {name} <span className="font-normal text-muted-foreground">({rows.length})</span>
                </h3>
                {rows.length ? (
                  <ul className="divide-y text-sm">
                    {rows.map((r) => (
                      <li key={r.log.propertyId} className="flex items-center justify-between gap-2 px-4 py-2">
                        <Link href={`/properties/${r.log.propertyId}?tab=listing`} className="hover:underline">
                          {r.displayAddress}
                        </Link>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.log.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Nothing live.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing is live on a portal yet.</p>
        )}
      </AdminSection>

      <AdminSection title="Recent updates">
        <AdminTable headers={["Property", "Portal", "What", "Result", "Time"]}>
          {logs.map(({ log, displayAddress }) => (
            <tr key={log.id}>
              <td className="px-4 py-3">{displayAddress ?? log.propertyId}</td>
              <td className="px-4 py-3">{PORTAL_NAME[log.portal] ?? log.portal}</td>
              <td className="px-4 py-3">{log.action === "send" ? "Sent listing" : log.action === "remove" ? "Took listing down" : log.action}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    log.status === "success"
                      ? "text-green-600"
                      : log.status === "failed"
                        ? "text-red-600"
                        : ""
                  }
                >
                  {log.status === "success" ? "Done" : log.status === "failed" ? "Failed" : log.status}
                </span>
                {log.status === "failed" && log.errorMessage && (
                  <span className="block max-w-xs truncate text-xs text-muted-foreground" title={log.errorMessage}>
                    {log.errorMessage}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </td>
            </tr>
          ))}
          {!logs.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                Nothing sent yet
              </td>
            </tr>
          )}
        </AdminTable>
      </AdminSection>

      <p className="mt-4 text-sm text-muted-foreground">
        To get your feed login details, ask Rightmove or OnTheMarket for a data feed account for your branch, then send them to Let Flow support.
      </p>
    </div>
  );
}
