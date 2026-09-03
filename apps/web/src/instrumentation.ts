export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { ensureJobInvoiceSchema, ensurePetRequestsSchema } = await import("./lib/db/ensure-schema");
    await ensureJobInvoiceSchema();
    await ensurePetRequestsSchema();
  } catch (err) {
    console.error("[schema] job invoice ensure failed", err);
  }
}
