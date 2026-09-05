import Link from "next/link";
import { tenantRegistry } from "@repo/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function safeNextPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/preview")) {
    return "/";
  }
  return raw;
}

function hrefForAgency(nextPath: string, slug: string): string {
  const url = new URL(nextPath, "https://letflow.local");
  url.searchParams.set("agency", slug);
  return `${url.pathname}${url.search}`;
}

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  const nextPath = safeNextPath(rawNext);
  const agencies = Object.values(tenantRegistry);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        LetFlow preview
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Choose a site</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        This Vercel URL hosts every agency website. Pick one for this session —
        it is remembered in a cookie until you come back here.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {agencies.map((agency) => (
          <Card key={agency.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{agency.productName}</CardTitle>
              <CardDescription>{agency.name}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild className="w-full">
                <Link href={hrefForAgency(nextPath, agency.id)}>Open site</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
