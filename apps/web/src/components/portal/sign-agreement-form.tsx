"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignAgreementForm({
  token,
  fullName,
  role,
  maskedEmail,
}: {
  token: string;
  fullName: string;
  role: string;
  /** Set when the signer has an email address: they must confirm a code sent to it. */
  maskedEmail: string | null;
}) {
  const router = useRouter();
  const needsCode = Boolean(maskedEmail);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"code" | "sign" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy("code");
    setError(null);
    try {
      const res = await fetch(`/api/sign/${encodeURIComponent(token)}/code`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't send a code. Try again.");
        return;
      }
      setCodeSent(data.sentTo ?? maskedEmail);
      setDemoCode(data.demoCode ?? null);
    } finally {
      setBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("sign");
    setError(null);
    try {
      const res = await fetch(`/api/sign/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_name: name, agree, code: needsCode ? code : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't sign. Try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const codeOk = !needsCode || /^\d{6}$/.test(code.replace(/\s/g, ""));

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {needsCode && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">Step 1: confirm it&apos;s you</p>
          <p className="mt-1 text-muted-foreground">
            {codeSent
              ? `We've emailed a 6-digit code to ${codeSent}. It works for 15 minutes.`
              : `We'll email a 6-digit code to ${maskedEmail}.`}
          </p>
          {demoCode && (
            <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-amber-900">
              Demo only, no email is sent: your code is <span className="font-mono font-semibold">{demoCode}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            {codeSent && (
              <div>
                <Label htmlFor="sign-code" className="text-xs">
                  Code
                </Label>
                <Input
                  id="sign-code"
                  className="mt-1 w-36 font-mono tracking-widest"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            )}
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={sendCode}>
              {busy === "code" ? "Sending…" : codeSent ? "Send a new code" : "Email me a code"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="signed-name">
          {needsCode ? "Step 2: " : ""}Type your full name to sign as {role}
        </Label>
        <Input
          id="signed-name"
          className="mt-1.5"
          placeholder={fullName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I have read this agreement and agree to be bound by it. I understand typing my name is my signature.</span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy !== null || !agree || name.trim().length < 2 || !codeOk || (needsCode && !codeSent)}>
        {busy === "sign" ? "Signing…" : "Sign agreement"}
      </Button>
    </form>
  );
}
