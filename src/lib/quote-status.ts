// Situações do orçamento, na ordem em que acontecem
export const QUOTE_STATUSES = ["PENDING", "APPROVED", "IN_PROGRESS", "DONE", "LOST"] as const;
export type QuoteStatusKey = (typeof QUOTE_STATUSES)[number];

export const STATUS_LABEL: Record<QuoteStatusKey, string> = {
  PENDING: "Em aprovação",
  APPROVED: "Aprovado",
  IN_PROGRESS: "Em obra",
  DONE: "Finalizado",
  LOST: "Não fechou",
};

export function isQuoteStatus(value: unknown): value is QuoteStatusKey {
  return typeof value === "string" && (QUOTE_STATUSES as readonly string[]).includes(value);
}
