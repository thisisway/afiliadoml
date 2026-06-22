import { type NextRequest, NextResponse } from "next/server";

const ML_API = "https://api.mercadolibre.com";

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
    // Call ML API server-side (no Origin header = no CORS block, no auth needed)
    const [mlRes, productsRes] = await Promise.all([
      fetch(
        `${ML_API}/sites/MLB/search?q=${encodeURIComponent(q)}&limit=${limit}`,
        { signal: controller.signal }
      ),
      fetch(`${FASTIFY_URL}/products?limit=500`, {
        headers: { authorization },
        signal: controller.signal,
      }),
    ]);

    if (!mlRes.ok) {
      const errBody = await mlRes.text();
      return NextResponse.json(
        { error: `ML API retornou ${mlRes.status}`, detail: errBody },
        { status: 502 }
      );
    }

    const mlJson = (await mlRes.json()) as any;

    let importedIds = new Set<string>();
    if (productsRes.ok) {
      const productsJson = (await productsRes.json()) as any;
      importedIds = new Set(
        (productsJson.data ?? [])
          .map((p: any) => p.externalId)
          .filter(Boolean)
      );
    }

    const items = (mlJson.results ?? []).map((item: any) => ({
      mlItemId:        item.id,
      title:           item.title,
      price:           item.price,
      originalPrice:   item.original_price ?? null,
      thumbnail:       item.thumbnail?.replace(/-I\.jpg$/, "-O.jpg") ?? item.thumbnail,
      permalink:       item.permalink,
      condition:       item.condition,
      soldQuantity:    item.sold_quantity,
      sellerName:      item.seller?.nickname ?? null,
      alreadyImported: importedIds.has(item.id),
    }));

    return NextResponse.json({ data: items, total: mlJson.paging?.total ?? 0 });
  } catch (err: any) {
    const message =
      err.name === "AbortError"
        ? "Timeout ao conectar com a API do Mercado Livre"
        : (err.message ?? "Erro desconhecido");
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
}
