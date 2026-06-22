import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "./product.schema.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
} from "./product.service.js";

const ML_API = "https://api.mercadolibre.com";

const auth = { preHandler: [(app: any) => app.authenticate] };

export async function productRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  // ── Mercado Livre integration ──────────────────────────────────────────────

  app.get("/ml/search", { ...authenticate }, async (request, reply) => {
    const { q, limit = "10" } = request.query as { q?: string; limit?: string };
    if (!q || q.trim().length < 2) {
      return reply.status(400).send({ error: "Parâmetro 'q' obrigatório (mín. 2 chars)" });
    }
    const url = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(q)}&limit=${limit}`;

    let res: Response;
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10_000);
      res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
    } catch (err: any) {
      return reply.status(502).send({ error: `Sem acesso à ML API: ${err?.message ?? err}` });
    }

    if (!res.ok) {
      return reply.status(502).send({ error: `ML API retornou ${res.status}` });
    }
    const json = await res.json() as any;
    const items = (json.results ?? []).map((item: any) => ({
      mlItemId:       item.id,
      title:          item.title,
      price:          item.price,
      originalPrice:  item.original_price ?? null,
      thumbnail:      item.thumbnail?.replace(/\-I\.jpg$/, "-O.jpg") ?? item.thumbnail,
      permalink:      item.permalink,
      condition:      item.condition,
      soldQuantity:   item.sold_quantity,
      sellerName:     item.seller?.nickname ?? null,
      alreadyImported: false,
    }));

    // mark which ones are already in DB
    const ids = items.map((i: any) => i.mlItemId);
    const existing = await prisma.product.findMany({
      where: { externalId: { in: ids } },
      select: { externalId: true },
    });
    const existingSet = new Set(existing.map((p: any) => p.externalId));
    items.forEach((i: any) => { i.alreadyImported = existingSet.has(i.mlItemId); });

    return reply.send({ data: items, total: json.paging?.total ?? 0 });
  });

  app.post("/ml/import", { ...authenticate }, async (request, reply) => {
    const { mlItemId } = z.object({ mlItemId: z.string().min(1) }).parse(request.body);

    const existing = await prisma.product.findFirst({ where: { externalId: mlItemId } });
    if (existing) {
      return reply.status(409).send({ error: "Produto já importado", data: existing });
    }

    let itemRes: Response;
    try {
      itemRes = await fetch(`${ML_API}/items/${mlItemId}`);
    } catch (err: any) {
      return reply.status(502).send({ error: `Sem acesso à ML API: ${err?.message ?? err}` });
    }
    if (!itemRes.ok) {
      return reply.status(404).send({ error: "Item não encontrado no Mercado Livre" });
    }
    const item = await itemRes.json() as any;

    const discountPercent = item.original_price && item.price < item.original_price
      ? Math.round((1 - item.price / item.original_price) * 100)
      : null;

    const product = await prisma.product.create({
      data: {
        marketplace:    "MERCADOLIVRE",
        externalId:     item.id,
        title:          item.title,
        originalUrl:    item.permalink ?? null,
        imageUrl:       item.pictures?.[0]?.url ?? null,
        price:          item.price,
        oldPrice:       item.original_price ?? null,
        discountPercent,
        sellerName:     item.seller_id ? String(item.seller_id) : null,
        category:       item.category_id ?? null,
        status:         "NEW",
      },
    });

    // Auto-generate affiliate link if ml_affiliate_id is configured
    let affiliateLink: string | null = null;
    if (item.permalink) {
      const affiliateSetting = await prisma.setting.findUnique({ where: { key: "ml_affiliate_id" } });
      if (affiliateSetting?.value) {
        const url = `${item.permalink}?matt_tool=${affiliateSetting.value}&matt_word=central-afiliado&matt_source=whatsapp&matt_medium=social`;
        await prisma.affiliateLink.create({ data: { productId: product.id, url, trackingId: affiliateSetting.value } });
        affiliateLink = url;
      }
    }

    return reply.status(201).send({ data: { ...product, affiliateLink } });
  });

  // ── CRUD ───────────────────────────────────────────────────────────────────

  app.get("/", { ...authenticate }, async (request, reply) => {
    const query = productQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Validation", message: query.error.issues, statusCode: 400 });
    }
    const result = await listProducts(query.data);
    return reply.send(result);
  });

  app.post("/", { ...authenticate }, async (request, reply) => {
    const body = createProductSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const product = await createProduct(body.data);
    return reply.status(201).send({ data: product });
  });

  app.get("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await getProduct(id);
    if (!product) {
      return reply.status(404).send({ error: "Not Found", message: "Produto não encontrado", statusCode: 404 });
    }
    return reply.send({ data: product });
  });

  app.patch("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateProductSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const product = await updateProduct(id, body.data);
    return reply.send({ data: product });
  });

  app.delete("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteProduct(id);
    return reply.status(204).send();
  });

  app.patch("/:id/status", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const product = await updateProductStatus(id, status);
    return reply.send({ data: product });
  });
}
