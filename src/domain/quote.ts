import Decimal from "decimal.js";

export type QuoteItemInput = {
  quantity: Decimal.Value;
  unitPrice: Decimal.Value;
  hazardous: boolean; // entra no adicional de risco quando o escopo é "MARKED"
};

export type QuoteInput = {
  items: QuoteItemInput[];
  hazardPercent: Decimal.Value; // 30 = 30%
  hazardScope: "ALL" | "MARKED";
  discountType: "PERCENT" | "AMOUNT";
  discountValue: Decimal.Value; // 10 = 10% ou R$ 10, conforme o tipo
  additionalFee: Decimal.Value; // valor fixo somado no fim
  costs: {
    materials: Decimal.Value;
    transport: Decimal.Value;
    taxPercent: Decimal.Value; // 6 = 6% do total
    other: Decimal.Value;
  };
};

// Valores em dinheiro são arredondados para centavos, como aparecem no PDF,
// para a soma das linhas sempre bater com o total
const cents = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

function nonNegative(value: Decimal.Value, label: string) {
  const decimal = new Decimal(value);
  if (decimal.isNegative()) throw new Error(`${label} não pode ser negativo.`);
  return decimal;
}

export function lineTotal(item: QuoteItemInput) {
  const quantity = nonNegative(item.quantity, "A quantidade");
  const price = nonNegative(item.unitPrice, "O preço");
  return cents(quantity.mul(price));
}

// Ordem da conta: subtotal → adicional de risco → desconto → taxa adicional → total.
// Depois, o lucro: total menos material, transporte, imposto (% do total) e outros custos.
export function calculateQuote(input: QuoteInput) {
  const lines = input.items.map(lineTotal);
  const subtotal = lines.reduce((sum, line) => sum.plus(line), new Decimal(0));

  const hazardPercent = nonNegative(input.hazardPercent, "O adicional de risco");
  const hazardBase =
    input.hazardScope === "ALL"
      ? subtotal
      : input.items.reduce(
          (sum, item, index) => (item.hazardous ? sum.plus(lines[index]) : sum),
          new Decimal(0),
        );
  const hazardAmount = cents(hazardBase.mul(hazardPercent).div(100));
  const subtotalWithHazard = subtotal.plus(hazardAmount);

  const discountValue = nonNegative(input.discountValue, "O desconto");
  const discountAmount =
    input.discountType === "PERCENT"
      ? cents(subtotalWithHazard.mul(Decimal.min(discountValue, 100)).div(100))
      : Decimal.min(cents(discountValue), subtotalWithHazard);

  const additionalFee = cents(nonNegative(input.additionalFee, "A taxa adicional"));
  const total = Decimal.max(0, subtotalWithHazard.minus(discountAmount).plus(additionalFee));

  const taxAmount = cents(total.mul(nonNegative(input.costs.taxPercent, "O imposto")).div(100));
  const totalCosts = nonNegative(input.costs.materials, "O custo de material")
    .plus(nonNegative(input.costs.transport, "O transporte"))
    .plus(nonNegative(input.costs.other, "Outros custos"))
    .plus(taxAmount);
  const profit = total.minus(totalCosts);
  const marginPercent = total.isZero() ? new Decimal(0) : profit.div(total).mul(100);

  return {
    lines,
    subtotal,
    hazardBase,
    hazardAmount,
    subtotalWithHazard,
    discountAmount,
    additionalFee,
    total,
    taxAmount,
    totalCosts,
    profit,
    marginPercent,
  };
}
