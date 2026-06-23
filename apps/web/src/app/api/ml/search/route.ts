import { type NextRequest, NextResponse } from "next/server";

// Use the public API URL — reliable from both Next.js server and browser.
// API_INTERNAL_URL is intentionally NOT used here because EasyPanel's internal
// Docker hostname (web-way_afiliadoml) cannot be resolved from the Next.js container.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const authorization = request.headers.get("authorization") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ error: "Query muito curta (mín. 2 caracteres)" }, { status: 400 });
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(
      `${API_URL}/products/ml/search?${searchParams.toString()}`,
      {
        headers: {
          authorization,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error ?? `Erro ${res.status} na API` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(json);
  } catch (err: any) {
    const message =
      err.name === "AbortError"
        ? "Timeout ao buscar produtos (>12s)"
        : `Erro ao conectar com a API: ${err.message ?? err}`;
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
}
