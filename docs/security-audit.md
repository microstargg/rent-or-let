# Legacy Site Security Audit — rent-or-let.co.uk

**Date:** June 2025  
**Purpose:** Document issues on the current site before DNS cutover to the new platform.

## Reported issues

1. **Browser "unsafe site" warnings** — intermittent SmartScreen or SSL warnings
2. **Permission prompts** — requests to "see other apps on this device"

## Likely root causes (legacy stack)

| Issue | Likely cause | New platform mitigation |
|-------|-------------|------------------------|
| Unsafe site warnings | Outdated CMS/plugins, mixed HTTP/HTTPS content, expired or misconfigured SSL, malware flag on shared hosting | Clean Next.js build on Vercel with HSTS, no third-party scripts |
| App permission prompts | Rogue third-party widget, old PWA/service worker, embedded iframe with broad permissions, or compromised plugin | No PWA manifest, Permissions-Policy header blocking device APIs, minimal third-party JS |
| Cookie non-compliance | No ICO-compliant consent banner | Built-in CMP with Accept/Reject parity and consent audit trail |

## Pre-cutover checklist

- [ ] Run SSL Labs test on current domain
- [ ] Check Google Safe Browsing: https://transparencyreport.google.com/safe-browsing/search
- [ ] Inspect current site third-party scripts (browser DevTools → Network)
- [ ] Confirm no service workers registered on legacy site
- [ ] Deploy new site to staging subdomain first
- [ ] Verify new site passes securityheaders.com scan
- [ ] DNS cutover with HTTPS-only redirects

## New platform security measures

- `Strict-Transport-Security` header (HSTS)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- Staff authorization via `staff_profiles` table (checked in admin layout and API routes)
- Neon Auth session cookies for authentication
- Portal credentials stored in server-side env vars only
- No database credentials exposed to the client

## Content migrated

- Company copy (about, services, contact)
- Two seed properties from current site (Ferndale Avenue, Howe Street)
- Office hours and contact details
- UKALA CMP reference (certificate PDF to be uploaded)
