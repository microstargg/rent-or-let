import { Building2, Home, KeyRound } from "lucide-react";
import { signInToDemo } from "@/app/login/demo-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo/constants";

const OPTIONS: Array<{ role: DemoRole; icon: typeof Building2; blurb: string }> = [
  {
    role: "staff",
    icon: Building2,
    blurb: "Run the agency: properties, tenancies, rent, arrears, statements, jobs and compliance.",
  },
  {
    role: "landlord",
    icon: KeyRound,
    blurb: "See what landlords see: their homes, monthly statements, payouts and repairs.",
  },
  {
    role: "renter",
    icon: Home,
    blurb: "See the tenant portal: rent due, payment history and reporting a repair.",
  },
];

export function DemoLoginPanel({ error }: { error?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Try the LetFlow demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Everything here is made up: a fictional agency with sample properties, landlords and
            tenants. Change anything you like. The demo resets every night.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-3">
            {OPTIONS.map(({ role, icon: Icon, blurb }) => (
              <form key={role} action={signInToDemo}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition hover:border-primary hover:bg-muted"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="block font-medium">Explore as {DEMO_ACCOUNTS[role].label.toLowerCase()}</span>
                    <span className="block text-sm text-muted-foreground">{blurb}</span>
                  </span>
                </button>
              </form>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            No sign-up needed. Emails, online payments and portal listings are switched off in the demo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
