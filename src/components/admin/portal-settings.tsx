"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface PortalSettingsProps {
  branch: {
    rightmove_sync_enabled: boolean;
    otm_sync_enabled: boolean;
  };
  rightmoveConfigured: boolean;
  otmConfigured: boolean;
}

export function PortalSettings({
  branch,
  rightmoveConfigured,
  otmConfigured,
}: PortalSettingsProps) {
  const router = useRouter();
  const [rightmoveEnabled, setRightmoveEnabled] = useState(branch.rightmove_sync_enabled);
  const [otmEnabled, setOtmEnabled] = useState(branch.otm_sync_enabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    rightmoveEnabled !== branch.rightmove_sync_enabled ||
    otmEnabled !== branch.otm_sync_enabled;

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/portals/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rightmove_sync_enabled: rightmoveEnabled,
          otm_sync_enabled: otmEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Portal sync settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          When enabled, available properties are automatically sent to the portal on save.
          Disabling queues removal of all current listings.
        </p>

        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={rightmoveEnabled}
              onChange={(e) => setRightmoveEnabled(e.target.checked)}
              disabled={!rightmoveConfigured}
            />
            <div>
              <Label className="cursor-pointer">Sync to Rightmove</Label>
              {!rightmoveConfigured && (
                <p className="text-xs text-amber-600">RTDF credentials not configured</p>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={otmEnabled}
              onChange={(e) => setOtmEnabled(e.target.checked)}
              disabled={!otmConfigured}
            />
            <div>
              <Label className="cursor-pointer">Sync to OnTheMarket</Label>
              {!otmConfigured && (
                <p className="text-xs text-amber-600">RTDF credentials not configured</p>
              )}
            </div>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={handleSave} disabled={loading || !dirty}>
          {loading ? "Saving…" : "Save portal settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
