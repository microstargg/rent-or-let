# Client money bank feed (TrueLayer)

UK agencies that collect rent by standing order or bank transfer can link their **designated client money account** via Open Banking Account Information (AIS). The platform ingests inbound credits and matches them to open invoices.

## Preferred rent rails

1. **Direct Debit via the platform (GoCardless)** — preferred long-term collection (planned). Authoritative payment webhooks; no statement guessing.
2. **Open Banking bank feed (this feature)** — reconciliation for money that already landed in the client account.
3. **Stripe Connect** — optional card “Pay now”; not the overnight primary path for UK rent.
4. **Manual mark paid** — fallback.

## Setup

1. Create a TrueLayer application (sandbox first). Enable AIS scopes: `info`, `accounts`, `balance`, `transactions`, `offline_access`.
2. Set redirect URI to `https://<agency-domain>/api/admin/bank-feed/callback` (also set `TRUELAYER_REDIRECT_URI`).
3. Add env vars from [`.env.example`](../.env.example): `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_TOKEN_SECRET`.
4. Run migration `drizzle/0009_bank_feed.sql` (or `npm run db:push`).
5. In **Admin → Settings → Client money bank feed**, click **Link client money account** and complete bank consent.
6. If multiple accounts are returned, pick the CMP / client money account only.

## Runtime

- Cron: `GET /api/cron/bank-feed` every 6 hours (`vercel.json`), authorized with `CRON_SECRET`.
- Manual: **Sync now** on the settings page (`POST /api/admin/bank-feed?action=sync`).
- High-confidence matches call `recordPaymentAndAllocate` with `method: bank_transfer` and `external_ref: tl_<provider_txn_id>`.
- Ambiguous credits create `payment_exceptions.kind = unmatched` for staff allocation under **Finance → Exceptions**.

## Matching signals

1. Invoice id (or short id) in the bank description  
2. Property agent ref / address fragment + amount  
3. Unique exact remaining amount (+ renter name for high confidence)

Only **high** confidence auto-posts; medium/none go to the exceptions queue.
