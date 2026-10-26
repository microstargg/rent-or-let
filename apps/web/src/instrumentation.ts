export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { ensureJobInvoiceSchema, ensurePetRequestsSchema, ensurePropertyStatementSchema } =
      await import("./lib/db/ensure-schema");
    await ensureJobInvoiceSchema();
    await ensurePetRequestsSchema();
    await ensurePropertyStatementSchema();
  } catch (err) {
    console.error("[schema] job invoice ensure failed", err);
  }
}
