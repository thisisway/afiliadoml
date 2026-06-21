import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { prisma } from "../../lib/prisma.js";

const createLinkSchema = z.object({
  productId: z.string(),
  targetUrl: z.string().url(),
});

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + process.env.JWT_SECRET).digest("hex").slice(0, 16);
}

function detectDevice(userAgent: string): string {
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return "mobile";
  if (/tablet/i.test(userAgent)) return "tablet";
  return "desktop";
}

export async function trackingRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  // Cria link curto
  app.post("/click-links", { ...authenticate }, async (request, reply) => {
    const body = createLinkSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }

    const shortCode = nanoid(8);
    const link = await prisma.clickLink.create({
      data: { shortCode, productId: body.data.productId, targetUrl: body.data.targetUrl },
    });

    const baseUrl = process.env.SHORT_LINK_BASE_URL ?? "http://localhost:3001";
    return reply.status(201).send({
      data: { ...link, shortUrl: `${baseUrl}/r/${shortCode}` },
    });
  });

  // Lista links
  app.get("/click-links", { ...authenticate }, async (request, reply) => {
    const { productId, page = 1, limit = 20 } = request.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (productId) where.productId = productId;

    const [data, total] = await Promise.all([
      prisma.clickLink.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { clickEvents: true } },
          product: { select: { id: true, title: true, marketplace: true } },
        },
      }),
      prisma.clickLink.count({ where }),
    ]);

    const baseUrl = process.env.SHORT_LINK_BASE_URL ?? "http://localhost:3001";
    const enriched = data.map((l) => ({
      ...l,
      shortUrl: `${baseUrl}/r/${l.shortCode}`,
      clicks: l._count.clickEvents,
    }));

    return reply.send({ data: enriched, total, page: Number(page), limit: Number(limit) });
  });

  // Redireciona e registra clique — rota pública
  app.get("/r/:shortCode", async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string };

    const link = await prisma.clickLink.findUnique({ where: { shortCode } });
    if (!link) {
      return reply.status(404).send({ error: "Not Found", message: "Link não encontrado", statusCode: 404 });
    }

    const ip = (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? request.ip ?? "unknown";

    const userAgent = request.headers["user-agent"] ?? "";

    // Registra clique de forma assíncrona (não bloqueia redirect)
    prisma.clickEvent.create({
      data: {
        clickLinkId: link.id,
        shortCode,
        userAgent: userAgent.slice(0, 500),
        ipHash: hashIp(ip),
        referrer: (request.headers.referer ?? "").slice(0, 500),
        deviceType: detectDevice(userAgent),
      },
    }).catch(() => {/* silencia erros de tracking */});

    return reply.redirect(link.targetUrl, 302);
  });
}
