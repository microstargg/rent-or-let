import { notFound } from "next/navigation";
import { bindRequestAgency } from "@/lib/agency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoAccessCode } from "@/lib/demo/access";
import { isDemoAgencySlug } from "@/lib/demo/constants";
import { enterDemoAccessCode } from "./actions";

export const metadata = { title: "Demo access" };

export default async function DemoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const agency = await bindRequestAgency();
  if (!isDemoAgencySlug(agency.slug)) notFound();
  const params = await searchParams;
  const open = demoAccessCode() != null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>LetFlow demo</CardTitle>
        </CardHeader>
        <CardContent>
          {open ? (
            <form action={enterDemoAccessCode} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the access code you were given to explore the demo.
              </p>
              <input type="hidden" name="next" value={params.next ?? ""} />
              <div>
                <Label htmlFor="code">Access code</Label>
                <Input id="code" name="code" type="password" required autoComplete="off" autoFocus />
              </div>
              {params.error && <p className="text-sm text-red-600">That code didn&apos;t work. Check it and try again.</p>}
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">The demo isn&apos;t open at the moment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
