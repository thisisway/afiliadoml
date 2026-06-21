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

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`API rodando em http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
