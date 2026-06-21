import type { Marketplace } from "./marketplace.js";

export type CouponStatus = "active" | "inactive" | "expired";
export type DiscountType = "percentage" | "fixed" | "free_shipping" | "unknown";

export type Coupon = {
  id: string;
  marketplace: Marketplace;
  code: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  startsAt?: Date;
  expiresAt?: Date;
  minOrderValue?: number;
  productId?: string;
  campaignId?: string;
  status: CouponStatus;
  createdAt: Date;
};
