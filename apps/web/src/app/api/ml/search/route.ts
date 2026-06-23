import { type NextRequest, NextResponse } from "next/server";

// Internal Docker URL (set in EasyPanel env): http://web-way_afiliadoml:3001
// Falls back to public URL for local dev
const FASTIFY_URL =
  process.env.API_INTERNAL_URL ??
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
    // Call Fastify server-side via internal Docker network — avoids browser CORS and handles ML auth
    const res = await fetch(
      `${FASTIFY_URL}/products/ml/search?${searchParams.toString()}`,
      {
        headers: { authorization },
        signal: controller.signal,
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error ?? `API retornou ${res.status}` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(json);
  } catch (err: any) {
    const message =
      err.name === "AbortError"
        ? "Timeout ao buscar produtos"
        : (err.message ?? "Erro ao conectar com a API");
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
}
