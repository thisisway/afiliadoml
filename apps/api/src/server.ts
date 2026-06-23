import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { affiliateLinkRoutes } from "./modules/products/affiliate-link.routes.js";
import { couponRoutes } from "./modules/coupons/coupon.routes.js";
import { templateRoutes } from "./modules/templates/template.routes.js";
import { destinationRoutes } from "./modules/destinations/destination.routes.js";
import { sendJobRoutes } from "./modules/send-jobs/send-job.routes.js";
import { trackingRoutes } from "./modules/tracking/tracking.routes.js";
import { reportRoutes } from "./modules/reports/report.routes.js";
import { copyRoutes } from "./modules/copy/copy.routes.js";
import { settingRoutes } from "./modules/settings/setting.routes.js";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

// Plugins
await app.register(helmet, { global: true });
await app.register(cors, {
  origin: true,
  credentials: true,
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "change_me_in_production",
  sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
});

// Decorador de autenticação
app.decorate("authenticate", async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized", message: "Token inválido ou ausente", statusCode: 401 });
  }
});

// Rotas
await app.register(authRoutes, { prefix: "/auth" });
await app.register(productRoutes, { prefix: "/products" });
await app.register(affiliateLinkRoutes, { prefix: "/products" });
await app.register(couponRoutes, { prefix: "/coupons" });
await app.register(templateRoutes, { prefix: "/templates" });
await app.register(destinationRoutes, { prefix: "/destinations" });
await app.register(sendJobRoutes, { prefix: "/send-jobs" });
await app.register(copyRoutes, { prefix: "/products" });
await app.register(trackingRoutes, { prefix: "/" });
await app.register(reportRoutes, { prefix: "/reports" });
await app.register(settingRoutes, { prefix: "/settings" });

// Health check
app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

// Connectivity test — checks ML API site + search with token
app.get("/health/ml", async (_req, reply) => {
  const { getMLToken } = await import("./lib/ml-auth.js");
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
  const token = await getMLToken();
  const headers = (t: string | null) => ({
    "User-Agent": UA,
    "Accept": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  });
  try {
    const tokenQs = token ? `&access_token=${encodeURIComponent(token)}` : "";
    const [siteRes, searchRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/sites/MLB`, { headers: headers(token) }),
      fetch(`https://api.mercadolibre.com/sites/MLB/search?q=adidas&limit=1${tokenQs}`, {
        headers: { "User-Agent": UA, "Accept": "application/json" },
      }),
    ]);
    const siteJson = await siteRes.json() as any;
    const searchJson = await searchRes.json() as any;
    return reply.send({
      authenticated: !!token,
      tokenPrefix: token ? token.slice(0, 12) + "…" : null,
      site: { ok: siteRes.ok, status: siteRes.status, id: siteJson?.id ?? null },
      search: {
        ok: searchRes.ok,
        status: searchRes.status,
        total: searchJson?.paging?.total ?? null,
        error: searchJson?.error ?? null,
        message: searchJson?.message ?? null,
      },
    });
  } catch (err: any) {
    return reply.status(502).send({ ok: false, error: err?.message ?? String(err) });
  }
});

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`API rodando em http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
