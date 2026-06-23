import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { invalidateMLTokenCache, getMLAuthUrl, exchangeMLCode } from "../../lib/ml-auth.js";

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

  // Returns the ML OAuth authorization URL so the frontend can redirect the user.
  app.get("/ml/auth-url", { ...authenticate }, async (request, reply) => {
    const { redirect_uri } = request.query as { redirect_uri?: string };
    if (!redirect_uri) return reply.status(400).send({ error: "redirect_uri obrigatório" });
    const url = await getMLAuthUrl(redirect_uri);
    if (!url) return reply.status(503).send({ error: "Credenciais ML não configuradas. Configure App ID e Secret Key primeiro." });
    return reply.send({ url });
  });

  // Exchange ML authorization code for user tokens (called after OAuth redirect).
  app.post("/ml/exchange", { ...authenticate }, async (request, reply) => {
    const body = z.object({ code: z.string().min(1), redirect_uri: z.string().url() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: "code e redirect_uri obrigatórios" });
    const ok = await exchangeMLCode(body.data.code, body.data.redirect_uri);
    if (!ok) return reply.status(502).send({ error: "Falha ao trocar código ML. Verifique App ID e Secret Key." });
    return reply.send({ ok: true });
  });

  // Returns whether a user token is stored (without exposing it).
  app.get("/ml/connected", { ...authenticate }, async (_request, reply) => {
    const row = await prisma.setting.findUnique({ where: { key: "ml_user_access_token" } });
    return reply.send({ connected: !!row?.value });
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
