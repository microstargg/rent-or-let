import { getSiteAgency } from "./agency";

export async function getTenant() {
  return (await getSiteAgency()).config;
}
