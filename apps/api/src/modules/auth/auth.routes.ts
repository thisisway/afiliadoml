import type { FastifyInstance } from "fastify";
import { registerSchema, loginSchema } from "./auth.schema.js";
import { registerUser, loginUser, getUserById } from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }

    try {
      const user = await registerUser(body.data);
      const token = app.jwt.sign({ id: user.id, role: user.role });
      return reply.status(201).send({ data: { token, user } });
    } catch (err: any) {
      return reply.status(409).send({ error: "Conflict", message: err.message, statusCode: 409 });
    }
  });

  app.post("/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }

    try {
      const user = await loginUser(body.data);
      const token = app.jwt.sign({ id: user.id, role: user.role });
      return reply.status(200).send({ data: { token, user } });
    } catch {
      return reply.status(401).send({ error: "Unauthorized", message: "Credenciais inválidas", statusCode: 401 });
    }
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string };
    const user = await getUserById(payload.id);
    if (!user) {
      return reply.status(404).send({ error: "Not Found", message: "Usuário não encontrado", statusCode: 404 });
    }
    return reply.send({ data: user });
  });
}
