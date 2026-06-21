export type DestinationType =
  | "whatsapp_group"
  | "whatsapp_channel"
  | "whatsapp_contact"
  | "telegram_channel"
  | "email"
  | "webhook";

export type MessagingProvider =
  | "whatsapp_business_api"
  | "telegram_bot"
  | "manual"
  | "webhook";

export type Destination = {
  id: string;
  name: string;
  type: DestinationType;
  provider: MessagingProvider;
  externalId?: string;
  isActive: boolean;
  dailyLimit?: number;
  intervalMinutes?: number;
  createdAt: Date;
};
