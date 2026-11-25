/**
 * Notification helpers (no database).
 * npx tsx --conditions=react-server scripts/test-notifications.ts
 */
import {
  digestDueToday,
  londonDateKey,
  parseNotificationPrefs,
} from "../apps/web/src/lib/notifications/preferences";
import { renderNotificationEmail } from "../apps/web/src/lib/notifications/email-template";
import { NOTIFICATIONS_MIGRATION_STATEMENTS } from "../apps/web/src/lib/db/ensure-schema";

process.env.CRON_SECRET ||= "test-secret";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const { createUnsubscribeToken, readUnsubscribeToken } = await import(
    "../apps/web/src/lib/notifications/unsubscribe-token"
  );

  assert(parseNotificationPrefs(null).digest === "weekdays", "default digest is weekdays");
  assert(parseNotificationPrefs({}).instantEmail === true, "instant emails default on");
  assert(parseNotificationPrefs({ digest: "nonsense" }).digest === "weekdays", "bad digest value falls back");
  assert(parseNotificationPrefs({ digest: "off", instantEmail: false }).digest === "off", "off is kept");

  const monday = new Date("2026-11-02T07:00:00Z");
  const saturday = new Date("2026-11-07T07:00:00Z");
  assert(digestDueToday("weekdays", monday) && !digestDueToday("weekdays", saturday), "weekdays skips Saturday");
  assert(digestDueToday("weekly", monday) && !digestDueToday("weekly", new Date("2026-11-03T07:00:00Z")), "weekly is Monday only");
  assert(digestDueToday("daily", saturday) && !digestDueToday("off", monday), "daily and off");
  // 23:30 UTC on 30 June is already 1 July in London (BST).
  assert(londonDateKey(new Date("2026-06-30T23:30:00Z")) === "2026-07-01", "London date in summer time");

  const token = createUnsubscribeToken("pms", "user-123");
  assert(token, "token created");
  const read = readUnsubscribeToken(token!);
  assert(read?.agencySlug === "pms" && read.staffId === "user-123", "token round trip");
  assert(readUnsubscribeToken(`${token}x`) === null, "tampered token rejected");

  const { html, text } = renderNotificationEmail({
    agencyName: "Test & Co",
    heading: "Hello <b>",
    sections: [{ title: "Your jobs", items: [{ label: "Fix <script>", href: "https://x.test/a?b=1&c=2" }] }],
    settingsUrl: "https://x.test/settings",
  });
  assert(!html.includes("<script>") && html.includes("Fix &lt;script&gt;"), "email escapes content");
  assert(text.includes("Fix <script>") && text.includes("YOUR JOBS (1)"), "plain text version");

  const ddl = NOTIFICATIONS_MIGRATION_STATEMENTS.join("\n");
  assert(ddl.includes("work_orders ADD COLUMN IF NOT EXISTS assignee_staff_id"), "migration adds job assignee");
  assert(ddl.includes("CREATE TABLE IF NOT EXISTS notifications"), "migration creates notifications");
  assert(ddl.includes("notification_prefs"), "migration adds staff preferences");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
