"use client";

import { signOutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function AdminSignOut() {
  return (
    <form action={signOutAction}>
      <Button variant="ghost" size="sm" className="mt-1 h-auto p-0 text-xs" type="submit">
        Sign out
      </Button>
    </form>
  );
}
