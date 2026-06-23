import { prisma } from "./prisma.js";

const ML_OAUTH = "https://api.mercadolibre.com/oauth/token";

interface TokenCache {
  access_token: string;
  expires_at: number;
}

let cache: TokenCache | null = null;

async function getCredentials(): Promise<{ appId: string; secret: string } | null> {
  // Prefer environment variables
  const envAppId = process.env.ML_APP_ID;
  const envSecret = process.env.ML_SECRET_KEY;
  if (envAppId && envSecret) return { appId: envAppId, secret: envSecret };

  // Fall back to database settings
  try {
    const [appIdSetting, secretSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "ml_app_id" } }),
      prisma.setting.findUnique({ where: { key: "ml_secret_key" } }),
    ]);
    if (appIdSetting?.value && secretSetting?.value) {
      return { appId: appIdSetting.value, secret: secretSetting.value };
    }
  } catch {
    // ignore DB errors
  }

  return null;
}

export async function getMLToken(): Promise<string | null> {
  if (cache && Date.now() < cache.expires_at) return cache.access_token;

  const creds = await getCredentials();
  if (!creds) return null;

  try {
    const res = await fetch(ML_OAUTH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: creds.appId,
        client_secret: creds.secret,
      }).toString(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    cache = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in - 300) * 1000,
    };
    return cache.access_token;
  } catch {
    return null;
  }
}

export function mlHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Invalidate cache when credentials change
export function invalidateMLTokenCache() {
  cache = null;
}
