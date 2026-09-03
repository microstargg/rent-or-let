import type { TenantConfig } from "../../packages/config/src/types";
import { siteContent } from "./site";

const config: TenantConfig = {
  id: "pms",
  name: "Property Management Services",
  shortName: "PMS",
  productName: "Rent or Let",
  domain: "https://www.rent-or-let.co.uk",
  paymentRefPrefix: "ROL",
  logo: {
    type: "text",
    lines: ["Property", "Management", "Services"],
  },
  theme: {
    navy: "#1a2b3c",
    blue: "#3478bf",
  },
  site: siteContent,
};

export default config;
