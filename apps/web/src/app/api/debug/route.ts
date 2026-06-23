import { NextResponse } from "next/server";

// Diagnostic endpoint — shows API URL, connectivity, and ML token status.
// Access: GET /api/debug
export async function GET() {
  const apiUrl =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001";

  let reachable = false;
  let healthData: unknown = null;
  let reachError: string | null = null;
  let mlHealth: unknown = null;
  let mlError: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
    reachable = res.ok;
    healthData = await res.json().catch(() => null);
  } catch (err: any) {
    reachError = err?.message ?? String(err);
  }

  if (reachable) {
    try {
      const res = await fetch(`${apiUrl}/health/ml`, { signal: AbortSignal.timeout(10000) });
      mlHealth = await res.json().catch(() => null);
    } catch (err: any) {
      mlError = err?.message ?? String(err);
    }
  }

  return NextResponse.json({
    resolvedApiUrl: apiUrl,
    envVars: {
      API_URL: process.env.API_URL ?? "(not set)",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "(not set)",
    },
    apiReachable: reachable,
    healthData,
    reachError,
    mlHealth,
    mlError,
  });
}
