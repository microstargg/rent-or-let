"use client";

import { createContext, useContext } from "react";
import type { TenantConfig } from "./types";

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

/** Like useTenant, but returns null outside a TenantProvider (e.g. error boundaries). */
export function useOptionalTenant(): TenantConfig | null {
  return useContext(TenantContext);
}

export function useTenant(): TenantConfig {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return tenant;
}
