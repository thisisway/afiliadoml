import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const destinationSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["WHATSAPP_GROUP", "WHATSAPP_CHANNEL", "WHATSAPP_CONTACT", "TELEGRAM_CHANNEL", "EMAIL", "WEBHOOK"]),
  provider: z.enum(["WHATSAPP_BUSINESS_API", "TELEGRAM_BOT", "MANUAL", "WEBHOOK"]),
  externalId: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  dailyLimit: z.number().int().positive().optional(),
  intervalMinutes: z.number().int().positive().optional(),
});

export async function destinationRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (_request, reply) => {
    const destinations = await prisma.destination.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ data: destinations });
  });

  app.post("/", { ...authenticate }, async (request, reply) => {
    const body = destinationSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const destination = await prisma.destination.create({ data: body.data });
    return reply.status(201).send({ data: destination });
  });

  app.patch("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = destinationSchema.partial().safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const destination = await prisma.destination.update({ where: { id }, data: body.data });
    return reply.send({ data: destination });
  });

  app.delete("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.destination.delete({ where: { id } });
    return reply.status(204).send();
  });
}
