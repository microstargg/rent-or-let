import https from "node:https";
import type { PortalConfig } from "./rtdf-mapper";

const agentCache = new Map<string, https.Agent>();

/** Decode PEM from base64 (Vercel) or use raw PEM string (local .env). */
export function loadCertPem(envValue: string): Buffer {
  try {
    const decoded = Buffer.from(envValue, "base64").toString("utf-8");
    if (decoded.includes("BEGIN")) {
      return Buffer.from(decoded, "utf-8");
    }
  } catch {
    // fall through to raw PEM
  }
  return Buffer.from(envValue, "utf-8");
}

/**
 * Rightmove/OTM RTDF use a single password-protected PEM keystore for mTLS.
 * The same buffer is passed as both cert and key (see rightmove-rtdf package).
 */
export function getPortalAgent(config: PortalConfig): https.Agent | null {
  const cached = agentCache.get(config.name);
  if (cached) return cached;

  const certPemEnv = process.env[config.certEnvKey];
  if (!certPemEnv) return null;

  const pem = loadCertPem(certPemEnv);
  const passphrase = process.env[config.certPasswordEnvKey] || undefined;

  const agent = new https.Agent({
    cert: pem,
    key: pem,
    passphrase,
    keepAlive: true,
    minVersion: "TLSv1.2",
  });

  agentCache.set(config.name, agent);
  return agent;
}

export interface RtdfHttpResponse {
  ok: boolean;
  status: number;
  data: unknown;
  text: string;
}

export async function rtdfRequest(
  url: string,
  options: {
    method: "POST";
    body: string;
    agent: https.Agent;
  }
): Promise<RtdfHttpResponse> {
  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "rent-or-let-rtdf/1.0",
          "Content-Length": Buffer.byteLength(options.body),
        },
        agent: options.agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          let data: unknown = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = { raw: text };
          }
          resolve({
            ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
            status: res.statusCode ?? 500,
            data,
            text,
          });
        });
      }
    );
    req.on("error", reject);
    req.write(options.body);
    req.end();
  });
}

export function isPortalConfigured(config: PortalConfig): boolean {
  return Boolean(config.networkId && process.env[config.certEnvKey]);
}
