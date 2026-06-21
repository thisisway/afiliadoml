import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

export async function settingRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (_request, reply) => {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    return reply.send({ data: settings });
  });

  app.patch("/:key", { ...authenticate }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = z.object({ value: z.string() }).parse(request.body);
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return reply.send({ data: setting });
  });
}
