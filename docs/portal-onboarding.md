# Portal RTDF Onboarding Guide



Rightmove ADF page: https://www.rightmove.co.uk/adf.html



For **UK lettings**, you need the Real Time Feed (RTDF) — not the New Homes FTP feed.



## Pre-contact checklist (rent-or-let app)



Before emailing Rightmove, confirm our side is ready:



| Requirement | App status |

|-------------|------------|

| SendProperty (`sendpropertydetails`) | Implemented with mTLS |

| RemoveProperty (`removeproperty`) | Implemented with mTLS |

| GetBranchPropertyList (`getbranchpropertylist`) | Implemented — use **Test RTDF connection** in Admin → Portal sync |

| Lettings channel (channel = 2) | Configured |

| UK date formats (`dd-MM-yyyy`, `dd-MM-yyyy HH:mm:ss`) | Fixed |

| Numeric network/branch IDs | Fixed |

| Property type / status / furnished enums | Fixed to Rightmove codes |

| Admin portal on/off toggles | Admin → Portal sync |

| Cron queue (every 5 min) | `/api/cron/portal-sync` |

| Public HTTPS image URLs | Vercel Blob in production |
| OTM API (mirrors Rightmove v1.4) | Same mapper + mTLS client |
| EPC / floorplan / virtual tour media | Sent when URLs set on property |



**Still needed from Rightmove (you cannot test without these):**



- Network ID

- Branch ID (lettings)

- PEM keystore + SMS password

- Sandbox API URL (usually `https://adfapi.adftest.rightmove.com/v1/property/`)

- Completed Provider Contact Form + EULA



## Rightmove



1. Download from https://www.rightmove.co.uk/adf.html:

   - Real Time Feed Specification

   - RTDF End User License Agreement

   - Provider Contact Form

2. Email **adfsupport@rightmove.co.uk** with:

   - Completed Provider Contact Form

   - Signed EULA

   - Your company details and branch (Property Management Services, Middlesbrough)

   - **Preferred keystore format: PEM** (Node.js on Vercel)

   - Mobile number for SMS certificate password

   - Proposed testing dates (1–2 weeks ahead)

   - Confirm you will test: SendProperty, RemoveProperty, GetBranchPropertyList

   - Note: lettings-only feed, channel 2

3. Rightmove sends test pack + keystore by email, password by SMS before testing

4. Add to Vercel environment variables:

   - `RIGHTMOVE_NETWORK_ID`

   - `RIGHTMOVE_BRANCH_ID`

   - `RIGHTMOVE_CERT_PEM` (base64-encoded PEM keystore — see below)

   - `RIGHTMOVE_CERT_PASSWORD` (SMS password from Rightmove)

   - `RIGHTMOVE_RTDF_URL=https://adfapi.adftest.rightmove.com/v1/property/` (sandbox only — remove or switch to live URL after go-live)

5. Set branch ID in Neon:



```sql

UPDATE branches SET rightmove_branch_id = 'YOUR_RM_BRANCH_ID'

WHERE id = '00000000-0000-0000-0000-000000000001';

```



6. In **Admin → Portal sync**, click **Test RTDF connection** to verify mTLS auth

7. Enable **Sync to Rightmove** and test with one dummy property (`TEST-001`)

8. Request go-live — Rightmove CS must confirm branch is live before listings appear on rightmove.co.uk



## OnTheMarket

OTM guide: [OnTheMarket Realtime Datafeed v2.4](https://www.scribd.com/document/906651333/Onthemarket-Realtime-Datafeed)

OTM mirrors **Rightmove RTDF v1.4** — our Rightmove payload format works for OTM with the same three property calls. OTM issues its **own** certificate and network/branch IDs.

| Requirement | App status |
|-------------|------------|
| Host `https://realtime-api.onthemarket.com` | Default in `OTM_RTDF_URL` |
| `/v1/property/sendpropertydetails` | Implemented |
| `/v1/property/removeproperty` | Implemented |
| `/v1/property/getbranchpropertylist` | Implemented |
| Rightmove-style mTLS (PEM) | Implemented |
| Lettings channel (2) | Configured |
| Response IDs (`otm_id` / `portal_id`) | Stored as `external_id` in sync status |

**OTM differences (optional — not required for basic lettings sync):**

- Extra `property_type` codes (beach hut, holiday lodge, etc.) — we use standard UK lettings types
- Optional `details.deposit_replacement_scheme` — not in our schema yet
- Optional `details.epc_information.epc_certificate_id` — not in our schema yet; EPC PDF sent as media type 6 if `epc_url` is set

**No separate sandbox URL** — OTM uses one production API URL. Test vs live is coordinated by their support team on their side (unlike Rightmove's `adftest` subdomain).

1. Email **support@onthemarket.com** with:
   - Mobile number (SMS certificate password)
   - Email address (certificate delivery)
   - Email for future RTDF enquiries
   - **Keystore format: PEM** (Node.js on Vercel)
   - Your **Rightmove Network ID** if you already have one
   - Any branch/property ID changes from an existing BLM feed
   - Confirm you will test: SendProperty, RemoveProperty, GetBranchPropertyList (lettings, channel 2)
2. Add to Vercel:
   - `OTM_NETWORK_ID`
   - `OTM_BRANCH_ID`
   - `OTM_CERT_PEM`
   - `OTM_CERT_PASSWORD`
   - `OTM_RTDF_URL` optional — defaults to `https://realtime-api.onthemarket.com/v1/property/`
3. Set branch ID in Neon:

```sql
UPDATE branches SET otm_branch_id = 'YOUR_OTM_BRANCH_ID'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

4. **Test RTDF connection** in Admin → Portal sync
5. Enable **Sync to OnTheMarket** and test with a dummy property
6. Coordinate go-live with OTM support



## Encoding the PEM certificate for Vercel



RTDF uses **mutual TLS (mTLS)** — the app sends your portal-issued PEM keystore on every API request. Store it as a single-line base64 string in Vercel.



**macOS / Linux:**



```bash

base64 -i your-cert.pem | tr -d '\n'

```



**Windows (PowerShell):**



```powershell

[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\your-cert.pem"))

```



Paste the output into `RIGHTMOVE_CERT_PEM` or `OTM_CERT_PEM`. The password from the portal goes in `*_CERT_PASSWORD`.



For local development you can paste the raw PEM contents instead of base64.



## Image hosting note



Rightmove fetches images from URLs you send. They use user-agent `rightmove-datafeed/1.0`. Your image URLs must be **public HTTPS** with TLS 1.2+. Vercel Blob URLs work in production.



## Initial bulk upload



1. Configure RTDF credentials in Vercel

2. Set branch IDs in Neon

3. Run **Test RTDF connection** in Admin → Portal sync

4. Enable each portal in admin settings

5. Ensure properties are `available` — saving auto-enqueues sync

6. Cron at `/api/cron/portal-sync` processes jobs every 5 minutes

7. Monitor Admin → Portal sync logs



## Troubleshooting



- **Credentials not configured**: Jobs queue but fail until env vars are set

- **403 / TLS errors**: Check PEM cert and password; confirm sandbox URL during testing

- **Branch ID errors**: Must be numeric; set in Neon or `RIGHTMOVE_BRANCH_ID` env var

- **Images not appearing**: URLs must be publicly accessible HTTPS

- **Listings not on live site**: Expected during sandbox; live requires go-live approval from Rightmove CS

