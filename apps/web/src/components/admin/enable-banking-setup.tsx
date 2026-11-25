"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 break-all rounded-md border bg-muted px-2 py-1.5 text-xs">{value}</code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <div className="mt-1 space-y-2 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </li>
  );
}

export function EnableBankingSetup({
  redirectUrl,
  agencyName,
  status,
  storageReady,
}: {
  redirectUrl: string;
  agencyName: string;
  status: { source: "agency" | "platform" | null; appId: string | null; savedAt: string | null };
  storageReady: boolean;
}) {
  const router = useRouter();
  const [appId, setAppId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onFile(f: File | null) {
    setFile(f);
    // The downloaded file is named after the application ID.
    const guess = f?.name.replace(/\.pem$/i, "") ?? "";
    if (!appId && /^[0-9a-f-]{36}$/i.test(guess)) setAppId(guess);
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("appId", appId);
      fd.set("key", file);
      const res = await fetch("/api/admin/bank-feed/enable-banking/credentials", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setMessage(data.warning ?? "Saved. Now go to Month end and click Connect bank.");
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remove your Enable Banking app from LetFlow? Bank syncing stops until you add it again.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bank-feed/enable-banking/credentials", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not remove");
      setMessage("Removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {status.source === "agency" && (
        <div className="rounded-xl border border-green-600/30 bg-green-600/5 p-4 text-sm">
          <p className="font-medium">Your Enable Banking app is set up.</p>
          <p className="mt-1 text-muted-foreground">
            Application {status.appId}. Connect or sync your bank from{" "}
            <Link href="/finance/month-end" className="text-primary underline">
              Month end
            </Link>
            . To use a different app, upload its key below.
          </p>
          <Button type="button" size="sm" variant="ghost" className="mt-2" disabled={busy} onClick={() => void remove()}>
            Remove app
          </Button>
        </div>
      )}
      {status.source === "platform" && (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          This agency is using LetFlow&apos;s test app. Upload your own below to switch to it.
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
        <h2 className="font-semibold">Why you set this up yourselves</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Your Enable Banking account and app belong to your agency. LetFlow never sees your bank login,
            and nobody at LetFlow can link or view an account you haven&apos;t approved.
          </li>
          <li>
            Enable Banking only lets your app read the accounts you link in step 4. Access is read-only, so
            payments can&apos;t be made through it.
          </li>
          <li>It&apos;s free while you only read your own accounts. It takes about 15 minutes.</li>
        </ul>
      </div>

      <ol className="space-y-3">
        <Step n={1} title="Create your Enable Banking account">
          <p>
            Go to{" "}
            <a href="https://enablebanking.com/sign-in/" target="_blank" rel="noreferrer" className="text-primary underline">
              enablebanking.com/sign-in
            </a>{" "}
            and enter a work email for the agency (ideally a shared one, such as accounts@). Open the link they
            email you. The account is created the first time you sign in.
          </p>
        </Step>
        <Step n={2} title="Register an application">
          <p>
            Open{" "}
            <a href="https://enablebanking.com/cp/applications" target="_blank" rel="noreferrer" className="text-primary underline">
              API applications
            </a>{" "}
            and fill in <strong>Add a new application</strong>:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Environment: <strong>Production</strong>
            </li>
            <li>Private key: keep the default (generated in your browser)</li>
            <li>
              Application name: <strong>{agencyName}</strong>. Your bank shows this name when you approve access.
            </li>
            <li>
              Allowed redirect URLs: paste this exactly
              <CopyField value={redirectUrl} />
            </li>
            <li>Fill in any contact, privacy or terms fields with your agency&apos;s details.</li>
          </ul>
          <p>
            Click <strong>Register</strong>. A file ending in <code>.pem</code> downloads. Its name is your
            application ID. Keep it somewhere safe, and don&apos;t email it around.
          </p>
        </Step>
        <Step n={3} title="Check the app appears as Inactive">
          <p>That&apos;s expected. It becomes active once you link your client account in the next step.</p>
        </Step>
        <Step n={4} title="Link your client account to the app">
          <p>
            Next to the new app, click <strong>Activate by linking accounts</strong>. Choose your bank, log in
            at your bank as normal, and approve access to the <strong>client account</strong>. Use a login
            that can see that account, usually the owner or a director on business online banking.
          </p>
          <p>The app then shows as active in restricted mode. It can only read the accounts you linked here.</p>
        </Step>
        <Step n={5} title="Upload the app to LetFlow">
          {!storageReady ? (
            <p className="text-amber-700">
              LetFlow can&apos;t store keys yet on this server. Contact LetFlow support to switch it on.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="eb-key">Private key file (.pem)</Label>
                <input
                  id="eb-key"
                  type="file"
                  accept=".pem,application/x-pem-file,application/x-x509-ca-cert,text/plain"
                  disabled={busy}
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                />
              </div>
              <div>
                <Label htmlFor="eb-app-id">Application ID</Label>
                <Input
                  id="eb-app-id"
                  value={appId}
                  placeholder="Filled in from the file name"
                  disabled={busy}
                  onChange={(e) => setAppId(e.target.value.trim())}
                  className="mt-1"
                />
              </div>
              <Button type="button" disabled={busy || !file || !appId} onClick={() => void save()}>
                {busy ? "Checking…" : "Save and check"}
              </Button>
              <p className="text-xs">
                The key is encrypted before it&apos;s stored. Only the bank feed uses it, to read the accounts you
                linked.
              </p>
            </div>
          )}
        </Step>
        <Step n={6} title="Connect from Month end">
          <p>
            In{" "}
            <Link href="/finance/month-end" className="text-primary underline">
              Month end
            </Link>
            , click <strong>Connect bank</strong>, pick the same bank and approve once more. This lets LetFlow
            read the account through your app. Transactions from the last 90 days come in and are matched
            automatically. Your bank asks you to reconfirm every 90 days.
          </p>
        </Step>
      </ol>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
