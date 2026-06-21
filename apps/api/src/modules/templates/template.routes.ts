import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  body: z.string().min(1),
  tone: z.string().optional(),
  marketplace: z.enum(["SHOPEE", "MERCADOLIVRE"]).optional(),
  isDefault: z.boolean().default(false),
});

export async function templateRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (_request, reply) => {
    const templates = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ data: templates });
  });

  app.post("/", { ...authenticate }, async (request, reply) => {
    const body = templateSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const template = await prisma.messageTemplate.create({ data: body.data });
    return reply.status(201).send({ data: template });
  });

  app.patch("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = templateSchema.partial().safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const template = await prisma.messageTemplate.update({ where: { id }, data: body.data });
    return reply.send({ data: template });
  });

  app.delete("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.messageTemplate.delete({ where: { id } });
    return reply.status(204).send();
  });
}
