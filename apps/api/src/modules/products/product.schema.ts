import { z } from "zod";

export const createProductSchema = z.object({
  marketplace: z.enum(["SHOPEE", "MERCADOLIVRE"]),
  title: z.string().min(3).max(500),
  description: z.string().optional(),
  originalUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().positive(),
  oldPrice: z.number().positive().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  sellerName: z.string().optional(),
  shippingInfo: z.string().optional(),
  category: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  externalId: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum([
    "NEW", "PENDING_APPROVAL", "APPROVED", "SCHEDULED",
    "SENT", "PAUSED", "REJECTED", "EXPIRED", "UNAVAILABLE",
  ]).optional(),
  notes: z.string().optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  marketplace: z.enum(["SHOPEE", "MERCADOLIVRE"]).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
