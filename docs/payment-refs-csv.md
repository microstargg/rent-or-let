# Unique payment references + CSV statement matching

Preferred rent collection for UK agencies: tenants pay by **free standing order / bank transfer** using a unique tenancy payment reference. Staff upload a bank statement CSV; the platform matches credits to open invoices.

## Payment references

- Format: `ROL-` + 6 bank-safe characters (e.g. `ROL-AB12CD`)
- Stored on `tenancies.metadata.payment_ref`
- Generated automatically when a tenancy is created
- Backfill existing active tenancies via **Admin → Settings → Backfill payment refs**
- Shown on Admin → Tenancies and in the renter portal

## Client money account details

Set under **Admin → Settings → Client money pay-in details**:

- Account name
- Sort code
- Account number

These are shown to tenants with their payment reference.

## CSV import

1. Export a statement from the bank as CSV.
2. Ensure columns include **Date**, **Description**, and **Amount** (positive amounts = credits).
3. Go to **Admin → Finance → Exceptions** and upload the file.

Matching priority:

1. Tenancy payment reference in the description
2. Property agent ref / address
3. Unique amount (+ renter name)

High-confidence matches call `recordPaymentAndAllocate`. Ambiguous credits appear in the exceptions queue for allocate / ignore.

Re-uploading the same rows is safe (idempotent on a hash of date + amount + description).

### Example CSV

```csv
Date,Description,Amount
2026-07-01,FP ROL-AB12CD RENT,1000.00
01/07/2026,BOB JONES STANDING ORDER,850.00
```

## Manual fallback

Staff can still **Mark paid** on invoices when needed.
