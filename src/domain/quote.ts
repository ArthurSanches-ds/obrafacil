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
    helperDays: Decimal.Value; // 0 = sem ajudante nessa obra
    helperDailyRate: Decimal.Value; // diária do ajudante
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
// Depois, o lucro: total menos material, transporte, ajudante, imposto (% do total) e outros custos.
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
  const helperCost = cents(
    nonNegative(input.costs.helperDays, "As diárias do ajudante").mul(
      nonNegative(input.costs.helperDailyRate, "A diária do ajudante"),
    ),
  );
  const totalCosts = nonNegative(input.costs.materials, "O custo de material")
    .plus(nonNegative(input.costs.transport, "O transporte"))
    .plus(nonNegative(input.costs.other, "Outros custos"))
    .plus(helperCost)
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
    helperCost,
    totalCosts,
    profit,
    marginPercent,
  };
}

// Para o PDF: o adicional de risco some como linha separada e entra no valor dos
// serviços de risco, proporcional a cada um. A última linha recebe a sobra do
// arredondamento, para a soma bater exatamente com serviços + risco.
export function embedHazard(
  items: QuoteItemInput[],
  hazardScope: QuoteInput["hazardScope"],
  totals: Pick<ReturnType<typeof calculateQuote>, "lines" | "hazardBase" | "hazardAmount">,
) {
  const { lines, hazardBase, hazardAmount } = totals;
  if (hazardAmount.isZero() || hazardBase.isZero()) return lines;

  const eligible = items.map((item) => hazardScope === "ALL" || item.hazardous);
  const lastEligible = eligible.lastIndexOf(true);
  let distributed = new Decimal(0);

  return lines.map((line, index) => {
    if (!eligible[index]) return line;
    if (index === lastEligible) return line.plus(hazardAmount.minus(distributed));
    const share = cents(hazardAmount.mul(line).div(hazardBase));
    distributed = distributed.plus(share);
    return line.plus(share);
  });
}
