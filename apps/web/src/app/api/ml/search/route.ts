import { type NextRequest, NextResponse } from "next/server";

const FASTIFY_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? "12";
  const authorization = request.headers.get("authorization") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `${FASTIFY_URL}/products/ml/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { headers: { authorization }, signal: controller.signal }
    );

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `API returned non-JSON response (status ${res.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    const message =
      err.name === "AbortError"
        ? "Timeout connecting to API"
        : (err.message ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
}
