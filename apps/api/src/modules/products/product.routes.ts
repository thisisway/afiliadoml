import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getMLToken, mlHeaders } from "../../lib/ml-auth.js";
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
import { generateCopy } from "../copy/copy.service.js";

const ML_API = "https://api.mercadolibre.com";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function fetchMLSellerNickname(sellerId: number, token: string | null): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${ML_API}/users/${sellerId}`, { headers: mlHeaders(token) }, 5000);
    if (!res.ok) return String(sellerId);
    const data = await res.json() as any;
    return data.nickname ?? String(sellerId);
  } catch {
    return String(sellerId);
  }
}

export async function productRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  // ── Mercado Livre integration ──────────────────────────────────────────────

  app.get("/ml/search", { ...authenticate }, async (request, reply) => {
    try {
      const {
        q,
        limit = "12",
        category,
        min_discount,
      } = request.query as { q?: string; limit?: string; category?: string; min_discount?: string };

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({ error: "Parâmetro 'q' obrigatório (mín. 2 chars)" });
      }

      const token = await getMLToken();
      if (!token) {
        return reply.status(503).send({ error: "ML_APP_ID e ML_SECRET_KEY não configurados nas variáveis de ambiente" });
      }

      // Fetch extra items when discount filter is active so we have enough after filtering
      const fetchLimit = min_discount ? Math.min(Number(limit) * 4, 50) : Math.min(Number(limit), 50);
      let searchUrl = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(q)}&limit=${fetchLimit}`;
      if (category) searchUrl += `&category=${encodeURIComponent(category)}`;

      const res = await fetchWithTimeout(searchUrl, { headers: mlHeaders(token) });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return reply.status(502).send({ error: `ML API retornou ${res.status}`, detail: body.slice(0, 200) });
      }

      const json = await res.json() as any;
      let results: any[] = json.results ?? [];

      // Client-side discount filter (ML API has no native min_discount param)
      if (min_discount) {
        const minPct = Number(min_discount);
        results = results.filter((item: any) => {
          if (!item.original_price || !item.price) return false;
          const pct = Math.round((1 - item.price / item.original_price) * 100);
          return pct >= minPct;
        });
      }

      const items = results.slice(0, Number(limit)).map((item: any) => {
        const discount = item.original_price && item.price < item.original_price
          ? Math.round((1 - item.price / item.original_price) * 100)
          : null;
        return {
          mlItemId:        item.id,
          title:           item.title,
          price:           item.price,
          originalPrice:   item.original_price ?? null,
          discountPercent: discount,
          thumbnail:       item.thumbnail?.replace(/-I\.jpg$/, "-O.jpg") ?? item.thumbnail,
          permalink:       item.permalink,
          condition:       item.condition,
          soldQuantity:    item.sold_quantity ?? null,
          freeShipping:    item.shipping?.free_shipping ?? false,
          sellerName:      item.seller?.nickname ?? null,
          alreadyImported: false,
        };
      });

      const ids = items.map((i: any) => i.mlItemId);
      if (ids.length > 0) {
        const existing = await prisma.product.findMany({
          where: { externalId: { in: ids } },
          select: { externalId: true },
        });
        const existingSet = new Set(existing.map((p: any) => p.externalId));
        items.forEach((i: any) => { i.alreadyImported = existingSet.has(i.mlItemId); });
      }

      return reply.send({ data: items, total: json.paging?.total ?? 0 });
    } catch (err: any) {
      return reply.status(500).send({ error: `Erro na busca ML: ${err?.message ?? String(err)}` });
    }
  });

  app.post("/ml/import", { ...authenticate }, async (request, reply) => {
    const { mlItemId } = z.object({ mlItemId: z.string().min(1) }).parse(request.body);

    const existing = await prisma.product.findFirst({ where: { externalId: mlItemId } });
    if (existing) {
      const activeLink = await prisma.affiliateLink.findFirst({ where: { productId: existing.id, isActive: true } });
      return reply.status(409).send({ error: "Produto já importado", data: { ...existing, affiliateLink: activeLink?.url ?? null } });
    }

    const token = await getMLToken();
    let itemRes: Response;
    try {
      itemRes = await fetchWithTimeout(`${ML_API}/items/${mlItemId}`, { headers: mlHeaders(token) });
    } catch (err: any) {
      return reply.status(502).send({ error: `Sem acesso à ML API: ${err?.message ?? err}` });
    }
    if (!itemRes.ok) {
      return reply.status(404).send({ error: "Item não encontrado no Mercado Livre" });
    }
    const item = await itemRes.json() as any;

    const sellerName = item.seller_id
      ? await fetchMLSellerNickname(item.seller_id, token)
      : null;

    const discountPercent = item.original_price && item.price < item.original_price
      ? Math.round((1 - item.price / item.original_price) * 100)
      : null;

    const freeShipping = item.shipping?.free_shipping ?? false;
    const shippingInfo = freeShipping ? "Frete grátis" : null;

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
        sellerName,
        shippingInfo,
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

  // ── Pipeline: generate copy + create send job in one shot ─────────────────

  app.post("/:id/pipeline", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };

    const pipelineSchema = z.object({
      destinationId: z.string().min(1),
      tone: z.enum(["popular", "direto", "engracado", "premium", "urgente", "discreto", "comparativo"]).default("popular"),
      couponId: z.string().optional(),
      scheduledAt: z.coerce.date().optional(),
    });

    const body = pipelineSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        affiliateLinks: { where: { isActive: true }, take: 1 },
        coupons: body.data.couponId
          ? { where: { couponId: body.data.couponId }, include: { coupon: true }, take: 1 }
          : false,
      },
    });

    if (!product) {
      return reply.status(404).send({ error: "Not Found", message: "Produto não encontrado", statusCode: 404 });
    }

    const activeLink = product.affiliateLinks[0];
    if (!activeLink) {
      return reply.status(422).send({ error: "Unprocessable", message: "Produto não tem link de afiliado ativo", statusCode: 422 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return reply.status(503).send({ error: "Service Unavailable", message: "OPENAI_API_KEY não configurada", statusCode: 503 });
    }

    let couponCode: string | undefined;
    if (body.data.couponId) {
      const pc = (product.coupons as any[])?.[0];
      couponCode = pc?.coupon?.code;
    }

    const copyText = await generateCopy({
      productTitle: product.title,
      price: Number(product.price),
      oldPrice: product.oldPrice ? Number(product.oldPrice) : undefined,
      discountPercent: product.discountPercent ?? undefined,
      couponCode,
      marketplace: product.marketplace,
      category: product.category ?? undefined,
      tone: body.data.tone,
      maxChars: 600,
      allowEmojis: true,
    });

    const [generatedMessage, sendJob] = await prisma.$transaction([
      prisma.generatedMessage.create({
        data: { productId: id, tone: body.data.tone, body: copyText },
      }),
      prisma.sendJob.create({
        data: {
          productId: id,
          destinationId: body.data.destinationId,
          messageText: copyText,
          affiliateLink: activeLink.url,
          couponId: body.data.couponId,
          userId: user.id,
          scheduledAt: body.data.scheduledAt,
          status: "PENDING_APPROVAL",
        },
      }),
    ]);

    // Update send job to link generated message
    await prisma.sendJob.update({
      where: { id: sendJob.id },
      data: { generatedMessageId: generatedMessage.id },
    });

    await prisma.product.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" },
    });

    return reply.status(201).send({ data: { generatedMessage, sendJob } });
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
