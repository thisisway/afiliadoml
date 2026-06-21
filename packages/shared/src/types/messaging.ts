import type { Destination } from "./destination.js";

export type SendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export interface MessagingProviderInterface {
  sendText(destination: Destination, text: string): Promise<SendResult>;
  sendImageWithCaption?(
    destination: Destination,
    imageUrl: string,
    caption: string
  ): Promise<SendResult>;
}

export type CopyTone =
  | "popular"
  | "direto"
  | "engracado"
  | "premium"
  | "urgente"
  | "discreto"
  | "comparativo";

export type GenerateCopyParams = {
  productTitle: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  couponCode?: string;
  marketplace: string;
  category?: string;
  tone: CopyTone;
  maxChars?: number;
  allowEmojis?: boolean;
};
