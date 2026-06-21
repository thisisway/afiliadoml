import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const couponSchema = z.object({
  marketplace: z.enum(["SHOPEE", "MERCADOLIVRE"]),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING", "UNKNOWN"]).optional(),
  discountValue: z.number().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  minOrderValue: z.number().positive().optional(),
  productId: z.string().optional(),
});

export async function couponRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (request, reply) => {
    const { marketplace, status, page = 1, limit = 20 } = request.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (marketplace) where.marketplace = marketplace;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.coupon.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: "desc" } }),
      prisma.coupon.count({ where }),
    ]);

    return reply.send({ data, total, page: Number(page), limit: Number(limit) });
  });

  app.post("/", { ...authenticate }, async (request, reply) => {
    const body = couponSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const coupon = await prisma.coupon.create({ data: body.data });
    return reply.status(201).send({ data: coupon });
  });

  app.get("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return reply.status(404).send({ error: "Not Found", message: "Cupom não encontrado", statusCode: 404 });
    }
    return reply.send({ data: coupon });
  });

  app.patch("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = couponSchema.partial().safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const coupon = await prisma.coupon.update({ where: { id }, data: body.data });
    return reply.send({ data: coupon });
  });

  app.delete("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.coupon.delete({ where: { id } });
    return reply.status(204).send();
  });
}
