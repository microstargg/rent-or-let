import { listPortalSyncLogs, getDefaultBranch } from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalSettings } from "@/components/admin/portal-settings";
import { PortalConnectionTest } from "@/components/admin/portal-connection-test";

export default async function AdminPortalsPage() {
  const [logs, branch] = await Promise.all([
    listPortalSyncLogs(50),
    getDefaultBranch(),
  ]);

  const rightmoveConfigured = Boolean(
    process.env.RIGHTMOVE_NETWORK_ID && process.env.RIGHTMOVE_CERT_PEM
  );
  const otmConfigured = Boolean(process.env.OTM_NETWORK_ID && process.env.OTM_CERT_PEM);

  return (
    <div>
      <h1 className="text-3xl font-bold">Portal sync</h1>
      <p className="mt-1 text-muted-foreground">
        Rightmove and OnTheMarket RTDF integration
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rightmove</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Credentials:{" "}
              <span className={rightmoveConfigured ? "text-green-600" : "text-amber-600"}>
                {rightmoveConfigured ? "Configured" : "Awaiting RTDF credentials"}
              </span>
            </p>
            <p>
              Sync:{" "}
              <span className={branch?.rightmoveSyncEnabled ? "text-green-600" : "text-muted-foreground"}>
                {branch?.rightmoveSyncEnabled ? "Enabled" : "Disabled"}
              </span>
            </p>
            {branch?.rightmoveBranchId && (
              <p className="text-muted-foreground">Branch ID: {branch.rightmoveBranchId}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OnTheMarket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Credentials:{" "}
              <span className={otmConfigured ? "text-green-600" : "text-amber-600"}>
                {otmConfigured ? "Configured" : "Awaiting RTDF credentials"}
              </span>
            </p>
            <p>
              Sync:{" "}
              <span className={branch?.otmSyncEnabled ? "text-green-600" : "text-muted-foreground"}>
                {branch?.otmSyncEnabled ? "Enabled" : "Disabled"}
              </span>
            </p>
            {branch?.otmBranchId && (
              <p className="text-muted-foreground">Branch ID: {branch.otmBranchId}</p>
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

      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Property</th>
              <th className="px-4 py-3 text-left">Portal</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(({ log, displayAddress }) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-4 py-3">{displayAddress ?? log.propertyId}</td>
                <td className="px-4 py-3 capitalize">{log.portal}</td>
                <td className="px-4 py-3">{log.action}</td>
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
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("en-GB")}
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No sync logs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        See <code className="text-xs">docs/portal-onboarding.md</code> for RTDF setup steps.
      </p>
    </div>
  );
}
