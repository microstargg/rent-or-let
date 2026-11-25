# Open banking bank feed (Enable Banking)

Month end can pull transactions straight from the agency's bank instead of a statement upload.
It uses [Enable Banking](https://enablebanking.com) for read-only account information (AIS), under
their licence, so LetFlow does not need its own FCA AISP permission. Pulled lines go through the
same matching as a CSV/PDF upload: money in to rent invoices by payment reference, money out to
landlord payouts and contractor jobs. CSV/PDF upload stays as the fallback.

## How it works

1. Staff open **Finance → Month end**, step 1, and click **Connect bank**.
2. They pick their bank, are sent to the bank to approve read access, and come back to
   `/api/admin/bank-feed/enable-banking/callback`.
3. Each shared account becomes a `bank_connections` row (`provider = 'enable_banking'`,
   `account_id` = Enable Banking account uid, `provider_user_id` = session id). The first sync
   reads 90 days back, later syncs overlap the last one by 7 days. Re-syncing never double-counts
   (`provider_txn_id = eb_<hash of account uid + bank entry reference>`).
4. **Sync now** pulls again. Only booked lines are imported; pending ones wait until they clear.
5. **Disconnect** revokes the session at Enable Banking. Lines already imported are kept.

UK consent lasts up to 90 days (or the bank's own limit), then the customer reconfirms.

## Setup (sandbox, for the demo)

1. Sign in at https://enablebanking.com/sign-in/ (an account is created on first sign-in).
2. Go to **API applications** (https://enablebanking.com/cp/applications) and add an application:
   - Environment: **Sandbox**
   - Private key: keep the default (generated in the browser)
   - Name: `LetFlow` (shown to the customer at the bank)
   - Redirect URLs: `https://demo.letflow.app/api/admin/bank-feed/enable-banking/callback`
     (add `http://localhost:3000/api/admin/bank-feed/enable-banking/callback` for local testing)
3. Click **Register**. A file named `<application-id>.pem` downloads. The file name is the app id.
4. In the platform Vercel project, add (Production, since demo.letflow.app is served by it):

```
ENABLE_BANKING_APP_ID=<application id, the .pem file name without .pem>
ENABLE_BANKING_PRIVATE_KEY=<base64 of the whole .pem file>
ENABLE_BANKING_AGENCIES=demo
```

   Base64 the key with `base64 -w0 <id>.pem` (macOS: `base64 -i <id>.pem`, Windows PowerShell:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("<id>.pem"))`). Pasting the PEM with `\n`
   escapes also works.
5. Redeploy, then on demo.letflow.app open Month end and click **Connect bank**. In sandbox,
   pick **Mock ASPSP** if it is listed (it is preselected) and follow its test login.

Optional:

```
ENABLE_BANKING_COUNTRY=GB          # bank list country (default GB)
ENABLE_BANKING_PSU_TYPE=business   # or personal (default business; falls back to what the bank supports)
ENABLE_BANKING_REDIRECT_URL=...    # only if the callback URL differs from <host>/api/admin/bank-feed/enable-banking/callback
```

`ENABLE_BANKING_AGENCIES` is a comma-separated list of agency slugs that see the button
(default `demo`; `*` for all). Keep PMS and Veri off it while the app is in sandbox, because the
same Vercel env serves every agency.

## Demo notes

- The nightly demo reset (03:00 UTC) wipes `bank_connections`, so connect the bank on the day.
- Sandbox transactions are made up by the mock bank, so they won't carry demo tenants' payment
  references: money in lands in **Exceptions** for manual matching rather than auto-matching.

## Agencies using their own Enable Banking app (live)

Each agency registers its **own** Enable Banking production app and links its own client account
in Enable Banking's control panel ("Activate by linking accounts"), which puts the app in free
restricted mode. LetFlow never sees bank logins and can't link an account the agency hasn't
approved. The guided steps are in the app at **Settings → Bank feed** (`/settings/bank-feed`),
which shows the exact redirect URL to whitelist and takes the app ID + `.pem` upload.

- The key is stored AES-256-GCM encrypted on a `bank_connections` row with
  `provider = 'enable_banking_app'` (`account_id` = app id, `access_token_enc` = encrypted PEM).
- Requires `BANK_FEED_ENCRYPTION_KEY` (any long random string) in the platform Vercel env. Without
  it the upload is refused. Changing it makes saved keys unreadable, so agencies would need to upload again.
- An agency's own app wins over the platform env app; the env app (`ENABLE_BANKING_*`) is now only
  the demo/test fallback.
- Removing the app marks that agency's Enable Banking bank links as revoked.
- Enable Banking describes restricted mode as for evaluation and individual non-commercial use; check
  their Terms of Service "Restriction of Use" before relying on it commercially.

## Going live (later)

Restricted production mode is free but only reads accounts linked in the Enable Banking control
panel by the app owner. Create a separate **Production** application, link the agency's client
account there, and set that app's id and key for the agency. Check the agency's bank is in the
GB list first. For many agencies, move to a paid Enable Banking contract.
