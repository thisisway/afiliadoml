export type Marketplace = "shopee" | "mercadolivre";

export type ProductData = {
  marketplace: Marketplace;
  externalId: string;
  title: string;
  description?: string;
  originalUrl: string;
  affiliateUrl?: string;
  imageUrl?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  sellerName?: string;
  sellerRating?: number;
  shippingInfo?: string;
  category?: string;
  commissionRate?: number;
  estimatedCommission?: number;
  availability?: "available" | "unavailable" | "unknown";
};

export type SearchParams = {
  marketplace: Marketplace;
  keywords?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  minCommission?: number;
  forbiddenWords?: string[];
  allowedSellers?: string[];
  page?: number;
  limit?: number;
};

export type CouponSearchParams = {
  marketplace: Marketplace;
  productId?: string;
  category?: string;
};

export interface MarketplaceProvider {
  identifyProductUrl(url: string): boolean;
  fetchProductData(url: string): Promise<ProductData>;
  searchProducts(params: SearchParams): Promise<ProductData[]>;
  generateAffiliateLink(productUrl: string, trackingId?: string): Promise<string>;
  fetchCoupons?(params: CouponSearchParams): Promise<CouponData[]>;
}

export type CouponData = {
  code: string;
  description?: string;
  discountType?: "percentage" | "fixed" | "free_shipping" | "unknown";
  discountValue?: number;
  expiresAt?: Date;
  minOrderValue?: number;
};
