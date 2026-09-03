import type { TenantConfig } from "../../packages/config/src/types";
import { siteContent } from "./site";

const config: TenantConfig = {
  id: "veri-properties",
  name: "Veri Properties",
  shortName: "Veri",
  productName: "Veri Properties",
  domain: "https://veri.properties",
  paymentRefPrefix: "VER",
  logo: {
    type: "text",
    lines: ["Veri", "Properties", ""],
  },
  theme: {
    navy: "#1e3a2f",
    blue: "#2d8a5e",
  },
  site: siteContent,
};

export default config;

