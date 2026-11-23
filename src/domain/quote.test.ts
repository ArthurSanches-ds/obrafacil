import { describe, expect, it } from "vitest";
import { calculateQuote, lineTotal, type QuoteInput } from "./quote";

const noCosts = {
  materials: 0,
  transport: 0,
  taxPercent: 0,
  other: 0,
  helperDays: 0,
  helperDailyRate: 0,
};

function quote(overrides: Partial<QuoteInput> = {}): QuoteInput {
  return {
    items: [{ quantity: 10, unitPrice: 90, hazardous: false }],
    hazardPercent: 0,
    hazardScope: "MARKED",
    discountType: "PERCENT",
    discountValue: 0,
    additionalFee: 0,
    costs: noCosts,
    ...overrides,
  };
}

describe("lineTotal", () => {
  it("multiplica quantidade por preço", () => {
    expect(lineTotal({ quantity: 32, unitPrice: 150, hazardous: false }).toNumber()).toBe(4800);
  });

  it("arredonda para centavos", () => {
    // 12,35 m² × R$ 90,33 = 1115,5755 → 1115,58
    expect(lineTotal({ quantity: "12.35", unitPrice: "90.33", hazardous: false }).toString()).toBe(
      "1115.58",
    );
  });

  it("recusa quantidade negativa", () => {
    expect(() => lineTotal({ quantity: -1, unitPrice: 90, hazardous: false })).toThrow();
  });
});

describe("calculateQuote", () => {
  it("bate com o orçamento #0001 do app antigo (forro de 32 m² com material)", () => {
    const result = calculateQuote(
      quote({
        items: [{ quantity: 32, unitPrice: 150, hazardous: false }],
        discountType: "AMOUNT",
        costs: { ...noCosts, materials: 1950, transport: 140 },
      }),
    );

    expect(result.total.toNumber()).toBe(4800);
    expect(result.totalCosts.toNumber()).toBe(2090);
    expect(result.profit.toNumber()).toBe(2710);
    expect(result.marginPercent.toDecimalPlaces(2).toNumber()).toBe(56.46);
  });

  it("soma todas as linhas no subtotal", () => {
    const result = calculateQuote(
      quote({
        items: [
          { quantity: 20, unitPrice: 90, hazardous: false },
          { quantity: 8, unitPrice: 80, hazardous: true },
        ],
      }),
    );
    expect(result.subtotal.toNumber()).toBe(2440);
    expect(result.total.toNumber()).toBe(2440);
  });

  describe("adicional de risco", () => {
    const items = [
      { quantity: 20, unitPrice: 90, hazardous: false }, // 1800
      { quantity: 8, unitPrice: 80, hazardous: true }, // 640 (beiral)
    ];

    it("só sobre os serviços marcados", () => {
      const result = calculateQuote(quote({ items, hazardPercent: 30, hazardScope: "MARKED" }));
      expect(result.hazardBase.toNumber()).toBe(640);
      expect(result.hazardAmount.toNumber()).toBe(192);
      expect(result.total.toNumber()).toBe(2632);
    });

    it("sobre todos os serviços", () => {
      const result = calculateQuote(quote({ items, hazardPercent: 30, hazardScope: "ALL" }));
      expect(result.hazardAmount.toNumber()).toBe(732);
      expect(result.total.toNumber()).toBe(3172);
    });

    it("zero quando nenhum serviço é de risco", () => {
      const result = calculateQuote(quote({ hazardPercent: 30, hazardScope: "MARKED" }));
      expect(result.hazardAmount.toNumber()).toBe(0);
    });
  });

  describe("desconto", () => {
    it("em % é calculado depois do risco", () => {
      // 900 + 30% de risco = 1170; 10% de desconto = 117
      const result = calculateQuote(
        quote({ hazardPercent: 30, hazardScope: "ALL", discountValue: 10 }),
      );
      expect(result.discountAmount.toNumber()).toBe(117);
      expect(result.total.toNumber()).toBe(1053);
    });

    it("em reais", () => {
      const result = calculateQuote(quote({ discountType: "AMOUNT", discountValue: 50 }));
      expect(result.total.toNumber()).toBe(850);
    });

    it("nunca passa do valor do orçamento", () => {
      const percent = calculateQuote(quote({ discountValue: 150 }));
      const amount = calculateQuote(quote({ discountType: "AMOUNT", discountValue: 5000 }));
      expect(percent.total.toNumber()).toBe(0);
      expect(amount.total.toNumber()).toBe(0);
    });
  });

  it("soma a taxa adicional depois do desconto", () => {
    const result = calculateQuote(quote({ discountValue: 10, additionalFee: 80 }));
    // 900 − 90 + 80
    expect(result.total.toNumber()).toBe(890);
  });

  describe("lucro", () => {
    it("desconta o imposto como % do total", () => {
      const result = calculateQuote(
        quote({ costs: { ...noCosts, materials: 200, transport: 50, taxPercent: 6, other: 10 } }),
      );
      expect(result.taxAmount.toNumber()).toBe(54);
      expect(result.totalCosts.toNumber()).toBe(314);
      expect(result.profit.toNumber()).toBe(586);
    });

    it("soma o ajudante: diárias × valor da diária", () => {
      const result = calculateQuote(
        quote({ costs: { ...noCosts, helperDays: 3, helperDailyRate: 120 } }),
      );
      expect(result.helperCost.toNumber()).toBe(360);
      expect(result.profit.toNumber()).toBe(540);
    });

    it("sem ajudante quando as diárias são zero", () => {
      const result = calculateQuote(
        quote({ costs: { ...noCosts, helperDays: 0, helperDailyRate: 120 } }),
      );
      expect(result.helperCost.toNumber()).toBe(0);
    });

    it("pode ser negativo quando o custo passa do preço", () => {
      const result = calculateQuote(quote({ costs: { ...noCosts, materials: 1000 } }));
      expect(result.profit.toNumber()).toBe(-100);
    });

    it("margem zero quando o total é zero", () => {
      const result = calculateQuote(quote({ items: [] }));
      expect(result.marginPercent.toNumber()).toBe(0);
    });
  });
});
