import { type NextRequest, NextResponse } from "next/server";

const ML_API = "https://api.mercadolibre.com";

const FASTIFY_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "12");
  const minDiscount = Number(searchParams.get("min_discount") ?? "0");
  const category = searchParams.get("category") ?? "";
  const authorization = request.headers.get("authorization") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 10000);

  try {
    // Fetch more items from ML when discount filter is active so we have enough after filtering
    const fetchLimit = minDiscount > 0 ? Math.min(limit * 4, 50) : limit;

    let mlUrl = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(q)}&limit=${fetchLimit}`;
    if (category) mlUrl += `&category=${encodeURIComponent(category)}`;

    const [mlRes, productsRes] = await Promise.all([
      fetch(mlUrl, { signal: controller.signal }),
      // Try to get already-imported products — gracefully ignore if Fastify is unreachable
      fetch(`${FASTIFY_URL}/products?limit=500`, {
        headers: { authorization },
        signal: controller.signal,
      }).catch(() => null),
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
    if (productsRes?.ok) {
      const productsJson = (await productsRes.json()) as any;
      importedIds = new Set(
        (productsJson.data ?? []).map((p: any) => p.externalId).filter(Boolean)
      );
    }

    let results: any[] = mlJson.results ?? [];

    // Apply min_discount filter
    if (minDiscount > 0) {
      results = results.filter((item: any) => {
        if (!item.original_price || !item.price) return false;
        const pct = Math.round((1 - item.price / item.original_price) * 100);
        return pct >= minDiscount;
      });
    }

    const items = results.slice(0, limit).map((item: any) => {
      const discountPercent =
        item.original_price && item.price < item.original_price
          ? Math.round((1 - item.price / item.original_price) * 100)
          : null;
      return {
        mlItemId:        item.id,
        title:           item.title,
        price:           item.price,
        originalPrice:   item.original_price ?? null,
        discountPercent,
        freeShipping:    item.shipping?.free_shipping ?? false,
        thumbnail:       item.thumbnail?.replace(/-I\.jpg$/, "-O.jpg") ?? item.thumbnail,
        permalink:       item.permalink,
        condition:       item.condition,
        soldQuantity:    item.sold_quantity ?? null,
        sellerName:      item.seller?.nickname ?? null,
        alreadyImported: importedIds.has(item.id),
      };
    });

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
