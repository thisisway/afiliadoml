import { prisma } from "./prisma.js";

const ML_OAUTH = "https://api.mercadolibre.com/oauth/token";

interface TokenCache {
  access_token: string;
  expires_at: number;
}

let credCache: TokenCache | null = null;
let userCache: TokenCache | null = null;

async function getCredentials(): Promise<{ appId: string; secret: string } | null> {
  const envAppId = process.env.ML_APP_ID;
  const envSecret = process.env.ML_SECRET_KEY;
  if (envAppId && envSecret) return { appId: envAppId, secret: envSecret };

  try {
    const [a, s] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "ml_app_id" } }),
      prisma.setting.findUnique({ where: { key: "ml_secret_key" } }),
    ]);
    if (a?.value && s?.value) return { appId: a.value, secret: s.value };
  } catch {}
  return null;
}

async function saveUserToken(data: { access_token: string; refresh_token?: string; expires_in: number }) {
  const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
  const ops: Promise<any>[] = [
    prisma.setting.upsert({
      where: { key: "ml_user_access_token" },
      update: { value: data.access_token },
      create: { key: "ml_user_access_token", value: data.access_token },
    }),
    prisma.setting.upsert({
      where: { key: "ml_user_token_expires_at" },
      update: { value: String(expiresAt) },
      create: { key: "ml_user_token_expires_at", value: String(expiresAt) },
    }),
  ];
  if (data.refresh_token) {
    ops.push(
      prisma.setting.upsert({
        where: { key: "ml_user_refresh_token" },
        update: { value: data.refresh_token },
        create: { key: "ml_user_refresh_token", value: data.refresh_token },
      })
    );
  }
  await Promise.all(ops);
  userCache = { access_token: data.access_token, expires_at: expiresAt };
}

async function refreshUserToken(): Promise<string | null> {
  const creds = await getCredentials();
  if (!creds) return null;
  try {
    const row = await prisma.setting.findUnique({ where: { key: "ml_user_refresh_token" } });
    if (!row?.value) return null;

    const res = await fetch(ML_OAUTH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: creds.appId,
        client_secret: creds.secret,
        refresh_token: row.value,
      }).toString(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data.access_token) return null;
    await saveUserToken(data);
    return data.access_token;
  } catch {
    return null;
  }
}

// Exchange ML authorization_code for user tokens and store them.
export async function exchangeMLCode(code: string, redirectUri: string): Promise<boolean> {
  const creds = await getCredentials();
  if (!creds) return false;
  try {
    const res = await fetch(ML_OAUTH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: creds.appId,
        client_secret: creds.secret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as any;
    if (!data.access_token) return false;
    await saveUserToken(data);
    return true;
  } catch {
    return false;
  }
}

// Build the ML OAuth authorization URL to redirect the user to.
export async function getMLAuthUrl(redirectUri: string): Promise<string | null> {
  const creds = await getCredentials();
  if (!creds) return null;
  return (
    `https://auth.mercadolivre.com.br/authorization` +
    `?response_type=code&client_id=${creds.appId}&redirect_uri=${encodeURIComponent(redirectUri)}`
  );
}

export async function getMLToken(): Promise<string | null> {
  // 1. User token cache (in-memory)
  if (userCache && Date.now() < userCache.expires_at) return userCache.access_token;

  // 2. User token from DB
  try {
    const [tokenRow, expiresRow] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "ml_user_access_token" } }),
      prisma.setting.findUnique({ where: { key: "ml_user_token_expires_at" } }),
    ]);
    if (tokenRow?.value) {
      const expiresAt = Number(expiresRow?.value ?? "0");
      if (Date.now() < expiresAt) {
        userCache = { access_token: tokenRow.value, expires_at: expiresAt };
        return tokenRow.value;
      }
      // Try refresh
      const refreshed = await refreshUserToken();
      if (refreshed) return refreshed;
    }
  } catch {}

  // 3. App-level client_credentials fallback
  if (credCache && Date.now() < credCache.expires_at) return credCache.access_token;

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
    if (!data.access_token) return null;
    credCache = {
      access_token: data.access_token,
      expires_at: Date.now() + ((data.expires_in ?? 21600) - 300) * 1000,
    };
    return credCache.access_token;
  } catch {
    return null;
  }
}

export function mlHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function invalidateMLTokenCache() {
  credCache = null;
  userCache = null;
}
