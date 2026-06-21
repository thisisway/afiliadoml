import OpenAI from "openai";
import type { GenerateCopyParams } from "@central-afiliado/shared";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const toneInstructions: Record<string, string> = {
  popular: "Use linguagem simples, popular e animada. Foque no preço e economia.",
  direto: "Seja direto e objetivo. Liste os principais benefícios sem exageros.",
  engracado: "Use humor leve e trocadilhos, mas mantenha o foco na oferta.",
  premium: "Use tom sofisticado, valorize a qualidade e experiência do produto.",
  urgente: "Crie senso de urgência real (estoque limitado, promoção por tempo limitado).",
  discreto: "Tom informativo e neutro, sem exageros. Apenas os fatos relevantes.",
  comparativo: "Compare o preço atual com o anterior, destaque a economia.",
};

export async function generateCopy(params: GenerateCopyParams): Promise<string> {
  const {
    productTitle,
    price,
    oldPrice,
    discountPercent,
    couponCode,
    marketplace,
    category,
    tone,
    maxChars = 600,
    allowEmojis = true,
  } = params;

  const marketplaceLabel = marketplace === "SHOPEE" ? "Shopee" : "Mercado Livre";
  const discountInfo = discountPercent ? `${discountPercent}% de desconto` : "";
  const oldPriceInfo = oldPrice ? `De R$ ${oldPrice.toFixed(2)} por` : "";
  const couponInfo = couponCode ? `Cupom disponível: ${couponCode}` : "";

  const prompt = `
Você é um especialista em marketing de afiliados brasileiro.
Crie uma mensagem de venda para WhatsApp/Telegram com as seguintes informações:

Produto: ${productTitle}
Marketplace: ${marketplaceLabel}
${category ? `Categoria: ${category}` : ""}
Preço atual: R$ ${price.toFixed(2)}
${oldPriceInfo}
${discountInfo}
${couponInfo}

Tom de voz: ${toneInstructions[tone] ?? toneInstructions.popular}
${allowEmojis ? "Use emojis relevantes." : "Não use emojis."}
Limite: ${maxChars} caracteres.

Regras:
- Não faça promessas falsas como "menor preço do Brasil"
- Não crie urgência enganosa sem base real
- O link será inserido automaticamente no final — NÃO inclua URL na mensagem
- Não inclua hashtags
- Escreva apenas o texto da mensagem, sem explicações
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.8,
  });

  return response.choices[0]?.message.content?.trim() ?? "";
}
