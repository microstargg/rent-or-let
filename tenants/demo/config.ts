import type { TenantConfig } from "../../packages/config/src/types";
import { siteContent } from "./site";

/** Fictional agency for sales demos and the public demo on demo.letflow.app. */
const config: TenantConfig = {
  id: "demo",
  name: "LetFlow Demo Lettings",
  shortName: "Demo",
  productName: "LetFlow Demo",
  domain: "https://demo.letflow.app",
  paymentRefPrefix: "DEM",
  logo: {
    type: "text",
    lines: ["LetFlow", "Demo", "Lettings"],
  },
  theme: {
    navy: "#1f2a44",
    blue: "#7c5cff",
  },
  site: siteContent,
};

export default config;
