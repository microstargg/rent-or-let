export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { ensureJobInvoiceSchema } = await import("./lib/db/ensure-schema");
    await ensureJobInvoiceSchema();
  } catch (err) {
    console.error("[schema] job invoice ensure failed", err);
  }
}
