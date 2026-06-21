export type ClickEvent = {
  id: string;
  shortCode: string;
  productId: string;
  campaignId?: string;
  destinationId?: string;
  marketplace: string;
  clickedAt: Date;
  userAgent?: string;
  ipHash?: string;
  referrer?: string;
};

export type ClickLink = {
  id: string;
  shortCode: string;
  productId: string;
  targetUrl: string;
  createdAt: Date;
};
