import type { Marketplace } from "./marketplace.js";

export type ProductStatus =
  | "new"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "sent"
  | "paused"
  | "rejected"
  | "expired"
  | "unavailable";

export type Product = {
  id: string;
  marketplace: Marketplace;
  externalId?: string;
  title: string;
  description?: string;
  originalUrl?: string;
  imageUrl?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  sellerName?: string;
  shippingInfo?: string;
  category?: string;
  commissionRate?: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AffiliateLink = {
  id: string;
  productId: string;
  url: string;
  trackingId?: string;
  isActive: boolean;
  createdAt: Date;
};
