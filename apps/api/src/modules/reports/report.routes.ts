import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function reportRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/dashboard", { ...authenticate }, async (_request, reply) => {
    const [
      totalProducts,
      approvedProducts,
      totalSentJobs,
      pendingJobs,
      totalClicks,
      topProducts,
      recentJobs,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: "APPROVED" } }),
      prisma.sendJob.count({ where: { status: "SENT" } }),
      prisma.sendJob.count({ where: { status: { in: ["CREATED", "PENDING_APPROVAL", "APPROVED"] } } }),
      prisma.clickEvent.count(),
      // Top 5 produtos mais clicados
      prisma.clickLink.findMany({
        take: 5,
        orderBy: { clickEvents: { _count: "desc" } },
        include: {
          product: { select: { id: true, title: true, marketplace: true, price: true } },
          _count: { select: { clickEvents: true } },
        },
      }),
      // 10 jobs mais recentes
      prisma.sendJob.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, title: true } },
          destination: { select: { id: true, name: true } },
        },
      }),
    ]);

    const clickRate = totalSentJobs > 0
      ? ((totalClicks / totalSentJobs) * 100).toFixed(1)
      : "0.0";

    return reply.send({
      data: {
        totalProducts,
        approvedProducts,
        totalSentJobs,
        pendingJobs,
        totalClicks,
        clickRate: `${clickRate}%`,
        topProducts: topProducts.map((l) => ({
          productId: l.productId,
          title: l.product.title,
          marketplace: l.product.marketplace,
          price: l.product.price,
          clicks: l._count.clickEvents,
        })),
        recentJobs,
      },
    });
  });
}
