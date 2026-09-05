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
    navy: "#141414",
    blue: "#E8A07A",
  },
  site: siteContent,
};

export default config;

