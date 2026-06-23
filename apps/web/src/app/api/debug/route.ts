import { NextResponse } from "next/server";

// Diagnostic endpoint — shows which API URL is configured and whether it's reachable.
// Access: GET /api/debug
export async function GET() {
  const apiUrl =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001";

  let reachable = false;
  let healthData: unknown = null;
  let reachError: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
    reachable = res.ok;
    healthData = await res.json().catch(() => null);
  } catch (err: any) {
    reachError = err?.message ?? String(err);
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
  });
}
