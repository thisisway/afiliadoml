import type { FastifyInstance } from "fastify";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "./product.schema.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
} from "./product.service.js";

const auth = { preHandler: [(app: any) => app.authenticate] };

export async function productRoutes(app: FastifyInstance) {
  const authenticate = { preHandler: [app.authenticate] };

  app.get("/", { ...authenticate }, async (request, reply) => {
    const query = productQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Validation", message: query.error.issues, statusCode: 400 });
    }
    const result = await listProducts(query.data);
    return reply.send(result);
  });

  app.post("/", { ...authenticate }, async (request, reply) => {
    const body = createProductSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const product = await createProduct(body.data);
    return reply.status(201).send({ data: product });
  });

  app.get("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await getProduct(id);
    if (!product) {
      return reply.status(404).send({ error: "Not Found", message: "Produto não encontrado", statusCode: 404 });
    }
    return reply.send({ data: product });
  });

  app.patch("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateProductSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Validation", message: body.error.issues, statusCode: 400 });
    }
    const product = await updateProduct(id, body.data);
    return reply.send({ data: product });
  });

  app.delete("/:id", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteProduct(id);
    return reply.status(204).send();
  });

  app.patch("/:id/status", { ...authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const product = await updateProductStatus(id, status);
    return reply.send({ data: product });
  });
}
