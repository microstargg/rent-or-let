"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const CONSENT_KEY = "rol_cookie_consent";
const BANNER_VERSION = "1.0";

type Preferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  async function saveConsent(preferences: Preferences) {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...preferences, version: BANNER_VERSION }));
    setVisible(false);

    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent_id: crypto.randomUUID(),
          preferences,
          banner_version: BANNER_VERSION,
        }),
      });
    } catch {
      // Non-blocking — local consent still recorded
    }
  }

  function acceptAll() {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  }

  function rejectAll() {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  }

  function saveCustom() {
    saveConsent({ necessary: true, analytics, marketing });
  }

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full border bg-background px-3 py-1.5 text-xs shadow-md hover:bg-muted"
      >
        Cookie settings
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg md:p-6"
    >
      <div className="container mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to make our site work. With your consent, we may also use
          non-essential cookies for analytics. You can accept all, reject all, or manage your
          preferences. See our{" "}
          <Link href="/legal/privacy" className="underline hover:text-primary">
            Privacy Notice
          </Link>
          .
        </p>

        {showDetails && (
          <div className="mt-4 space-y-3 rounded-lg border p-4 text-sm">
            <label className="flex items-center gap-2 opacity-60">
              <input type="checkbox" checked disabled /> Essential (always active)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              Analytics
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              Marketing
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={acceptAll} size="sm">
            Accept all
          </Button>
          <Button onClick={rejectAll} variant="outline" size="sm">
            Reject all
          </Button>
          <Button
            onClick={() => (showDetails ? saveCustom() : setShowDetails(true))}
            variant="outline"
            size="sm"
          >
            {showDetails ? "Save preferences" : "Manage preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
