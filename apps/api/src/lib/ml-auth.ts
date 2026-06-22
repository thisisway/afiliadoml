const ML_OAUTH = "https://api.mercadolibre.com/oauth/token";

interface TokenCache {
  access_token: string;
  expires_at: number;
}

let cache: TokenCache | null = null;

export async function getMLToken(): Promise<string | null> {
  const appId = process.env.ML_APP_ID;
  const secret = process.env.ML_SECRET_KEY;
  if (!appId || !secret) return null;

  if (cache && Date.now() < cache.expires_at) return cache.access_token;

  try {
    const res = await fetch(ML_OAUTH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: secret,
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
