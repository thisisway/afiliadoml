import { prisma } from "../../lib/prisma.js";
import type { CreateProductInput, UpdateProductInput, ProductQuery } from "./product.schema.js";

export async function listProducts(query: ProductQuery) {
  const { page, limit, marketplace, status, search } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (marketplace) where.marketplace = marketplace;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { sellerName: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        affiliateLinks: { where: { isActive: true }, take: 1 },
        _count: { select: { clickLinks: true, sendJobs: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      affiliateLinks: true,
      coupons: { include: { coupon: true } },
      generatedMessages: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { clickLinks: true, sendJobs: true } },
    },
  });
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({ data: input });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  return prisma.product.update({ where: { id }, data: input });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

export async function updateProductStatus(id: string, status: string) {
  return prisma.product.update({
    where: { id },
    data: { status: status as any },
  });
}
