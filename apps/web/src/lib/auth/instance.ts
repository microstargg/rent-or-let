import { getAgency } from "@repo/config/server";
import { getAuthForAgency } from "@/lib/auth/factory";

type NeonAuth = ReturnType<typeof getAuthForAgency>;

function getAuth(): NeonAuth {
  return getAuthForAgency(getAgency());
}

/** Request-scoped Neon Auth (ALS agency or env fallback). */
export const auth = new Proxy({} as NeonAuth, {
  get(_target, prop) {
    const instance = getAuth();
    const value = instance[prop as keyof NeonAuth];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { getAuthForAgency, getAuthForRequest } from "@/lib/auth/factory";
