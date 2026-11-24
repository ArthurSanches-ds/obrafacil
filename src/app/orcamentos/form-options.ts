import "server-only";

import { prisma } from "@/lib/db";
import type { QuoteFormValues, ServiceOption } from "./quote-form";

// Clientes e serviços para as listas do formulário, só da empresa do usuário
export async function loadFormOptions(companyId: string) {
  const [clients, services, company] = await Promise.all([
    prisma.client.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({ where: { companyId, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  const serviceOptions: ServiceOption[] = services.map((service) => ({
    id: service.id,
    name: service.name,
    unit: service.unit,
    laborPrice: service.laborPrice.toString(),
    materialPrice: service.materialPrice.toString(),
    hazardous: service.hazardous,
  }));

  return { clients, services: serviceOptions, company };
}

export function emptyQuoteValues(company: {
  defaultPaymentTerms: string | null;
  defaultDeadline: string | null;
  defaultWarranty: string | null;
  helperDailyRate: { toString(): string };
}): QuoteFormValues {
  return {
    clientId: "",
    title: "",
    hazardPercent: "0",
    hazardScope: "MARKED",
    discountType: "PERCENT",
    discountValue: "0",
    additionalFee: "0",
    paymentTerms: company.defaultPaymentTerms ?? "",
    deadline: company.defaultDeadline ?? "",
    warranty: company.defaultWarranty ?? "",
    notes: "",
    costMaterials: "0",
    costTransport: "0",
    costTaxPercent: "0",
    costOther: "0",
    hasHelper: false,
    helperDays: "0",
    helperDailyRate: company.helperDailyRate.toString().replace(".", ","),
    items: [],
  };
}
