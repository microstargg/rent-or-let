"use client";

import { PUBLIC_API } from "@repo/site-core";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

/** Browser origin of the LetFlow platform API for this agency. */
export function platformClientOrigin(): string {
  if (typeof document === "undefined") return "http://localhost:3000";
  const hostname = window.location.hostname;
  if (isLocalHost(hostname)) {
    return (
      process.env.NEXT_PUBLIC_PLATFORM_URL?.trim().replace(/\/$/, "") ||
      "http://localhost:3000"
    );
  }
  const platformHost = document.documentElement.dataset.platformHost;
  if (platformHost) return `https://${platformHost}`;
  const slug = document.documentElement.dataset.agency;
  if (slug) return `https://${slug}.letflow.app`;
  return "http://localhost:3000";
}

export function platformPost(path: string, body: unknown) {
  const slug =
    typeof document !== "undefined" ? document.documentElement.dataset.agency : undefined;
  return fetch(`${platformClientOrigin()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(slug ? { "x-agency-slug": slug } : {}),
    },
    body: JSON.stringify(body),
  });
}

export { PUBLIC_API };
