import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { invalidateMLTokenCache } from "../../lib/ml-auth.js";

// Keys that hold sensitive data — returned masked in GET
const SENSITIVE_KEYS = new Set(["ml_secret_key", "openai_api_key"]);

// Keys that affect ML OAuth token — invalidate cache on change
const ML_CRED_KEYS = new Set(["ml_app_id", "ml_secret_key"]);

export async function settingRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (_request, reply) => {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      // Return a masked placeholder so the UI knows the key exists without exposing the value
      settings[row.key] = SENSITIVE_KEYS.has(row.key) ? "••••••••" : row.value;
    }
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

    if (ML_CRED_KEYS.has(key)) invalidateMLTokenCache();

    return reply.send({ data: setting });
  });
}
