export type SendJobStatus =
  | "created"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled";

export type SendJob = {
  id: string;
  productId: string;
  campaignId?: string;
  destinationId: string;
  messageText: string;
  mediaUrl?: string;
  affiliateLink: string;
  scheduledAt?: Date;
  sentAt?: Date;
  status: SendJobStatus;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
};
