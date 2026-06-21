import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const createLinkSchema = z.object({
  url: z.string().url(),
  trackingId: z.string().optional(),
});

export async function affiliateLinkRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/:productId/affiliate-links", { ...authenticate }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const links = await prisma.affiliateLink.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ data: links });
  });

  app.post("/:productId/affiliate-links", { ...authenticate }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const body = createLinkSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }

    // Desativa links anteriores ao adicionar novo ativo
    await prisma.affiliateLink.updateMany({
      where: { productId, isActive: true },
      data: { isActive: false },
    });

    const link = await prisma.affiliateLink.create({
      data: { productId, ...body.data },
    });
    return reply.status(201).send({ data: link });
  });

  app.patch("/affiliate-links/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createLinkSchema.partial().safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const link = await prisma.affiliateLink.update({ where: { id }, data: body.data });
    return reply.send({ data: link });
  });

  app.delete("/affiliate-links/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.affiliateLink.delete({ where: { id } });
    return reply.status(204).send();
  });
}
