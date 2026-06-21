import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { generateCopy } from "./copy.service.js";

const generateCopySchema = z.object({
  tone: z.enum(["popular", "direto", "engracado", "premium", "urgente", "discreto", "comparativo"]).default("popular"),
  templateId: z.string().optional(),
  maxChars: z.number().int().positive().max(2000).default(600),
  allowEmojis: z.boolean().default(true),
  couponCode: z.string().optional(),
});

export async function copyRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.post("/:id/generate-copy", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = generateCopySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return reply.status(404).send({ error: "Not Found", message: "Produto não encontrado", statusCode: 404 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return reply.status(503).send({ error: "Service Unavailable", message: "OPENAI_API_KEY não configurada", statusCode: 503 });
    }

    const copyText = await generateCopy({
      productTitle: product.title,
      price: Number(product.price),
      oldPrice: product.oldPrice ? Number(product.oldPrice) : undefined,
      discountPercent: product.discountPercent ?? undefined,
      couponCode: body.data.couponCode,
      marketplace: product.marketplace,
      category: product.category ?? undefined,
      tone: body.data.tone,
      maxChars: body.data.maxChars,
      allowEmojis: body.data.allowEmojis,
    });

    const saved = await prisma.generatedMessage.create({
      data: {
        productId: id,
        templateId: body.data.templateId,
        tone: body.data.tone,
        body: copyText,
      },
    });

    return reply.status(201).send({ data: saved });
  });
}
