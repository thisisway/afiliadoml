import { type NextRequest, NextResponse } from "next/server";

// Priority:
//   1. API_URL          — server-only, set to http://afiliadoml:3001 in EasyPanel
//   2. NEXT_PUBLIC_API_URL — public var (works locally and as last resort)
//   3. localhost:3001   — local dev fallback
const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const authorization = request.headers.get("authorization") ?? "";

  if (q.trim().length < 2) {
    // Return 200 with error field so nginx doesn't replace JSON body
    return NextResponse.json({ error: "Query muito curta (mín. 2 caracteres)" });
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);

  try {
    const target = `${API_URL}/products/ml/search?${searchParams.toString()}`;

    const res = await fetch(target, {
      headers: {
        authorization,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      // Return 200 — EasyPanel nginx intercepts 5xx and replaces JSON body with HTML
      return NextResponse.json({
        error: json?.error ?? `API retornou ${res.status}`,
        _debug: { status: res.status, target },
      });
    }

    return NextResponse.json(json);
  } catch (err: any) {
    const message =
      err.name === "AbortError"
        ? "Timeout ao buscar produtos (>12s)"
        : `Sem conexão com a API (${API_URL}): ${err.message ?? err}`;
    // Return 200 so the browser receives JSON even when nginx proxies the response
    return NextResponse.json({ error: message });
  } finally {
    clearTimeout(tid);
  }
}
