import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const createJobSchema = z.object({
  productId: z.string(),
  destinationId: z.string(),
  messageText: z.string().min(1),
  affiliateLink: z.string().url(),
  mediaUrl: z.string().url().optional(),
  couponId: z.string().optional(),
  generatedMessageId: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export async function sendJobRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (request, reply) => {
    const { status, page = 1, limit = 20 } = request.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.sendJob.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, title: true, imageUrl: true, marketplace: true } },
          destination: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.sendJob.count({ where }),
    ]);

    return reply.send({ data, total, page: Number(page), limit: Number(limit) });
  });

  app.post("/", { ...authenticate }, async (request, reply) => {
    const user = request.user as { id: string };
    const body = createJobSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const job = await prisma.sendJob.create({
      data: { ...body.data, userId: user.id, status: "CREATED" },
    });
    return reply.status(201).send({ data: job });
  });

  app.get("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.sendJob.findUnique({
      where: { id },
      include: {
        product: true,
        destination: true,
        coupon: true,
      },
    });
    if (!job) {
      return reply.status(404).send({ error: "Not Found", message: "Job não encontrado", statusCode: 404 });
    }
    return reply.send({ data: job });
  });

  app.patch("/:id/approve", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.sendJob.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    return reply.send({ data: job });
  });

  app.patch("/:id/cancel", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.sendJob.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return reply.send({ data: job });
  });

  // Modo manual: marcar como enviado sem integração real
  app.patch("/:id/mark-sent", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.sendJob.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return reply.send({ data: job });
  });
}
