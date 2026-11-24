import "server-only";

import type { Prisma } from "@/generated/prisma";
import { calculateQuote } from "@/domain/quote";

type QuoteWithItems = Prisma.QuoteGetPayload<{ include: { items: true } }>;

const text = (value: { toString(): string }) => value.toString();

// Recalcula os totais a partir do que foi gravado: o banco guarda as entradas,
// e a conta é sempre a mesma função testada
export function quoteTotals(quote: QuoteWithItems) {
  return calculateQuote({
    items: quote.items.map((item) => ({
      quantity: text(item.quantity),
      unitPrice: text(item.unitPrice),
      hazardous: item.hazardous,
    })),
    hazardPercent: text(quote.hazardPercent),
    hazardScope: quote.hazardScope,
    discountType: quote.discountType,
    discountValue: text(quote.discountValue),
    additionalFee: text(quote.additionalFee),
    costs: {
      materials: text(quote.costMaterials),
      transport: text(quote.costTransport),
      taxPercent: text(quote.costTaxPercent),
      other: text(quote.costOther),
      helperDays: text(quote.helperDays),
      helperDailyRate: text(quote.helperDailyRate),
    },
  });
}
