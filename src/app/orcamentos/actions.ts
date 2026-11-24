"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { RemoveState } from "@/components/remove-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readForm, readList } from "@/lib/form-data";
import { decimalField } from "@/lib/form-fields";
import { isQuoteStatus } from "@/lib/quote-status";

export type QuoteFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

// Campo de número que aceita vazio como zero
const number = (rules: Parameters<typeof decimalField>[0] = {}) =>
  z
    .string()
    .transform((value) => value.trim() || "0")
    .pipe(decimalField(rules));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((value) => value || null);

const quoteSchema = z.object({
  clientId: z.string(),
  newClientName: z.string().trim().max(80, "Máximo de 80 caracteres."),
  newClientPhone: optionalText(30),
  title: optionalText(120),
  hazardPercent: number({ min: 0, max: 100 }),
  hazardScope: z.enum(["ALL", "MARKED"]),
  discountType: z.enum(["PERCENT", "AMOUNT"]),
  discountValue: number({ min: 0 }),
  additionalFee: number({ min: 0 }),
  paymentTerms: optionalText(500),
  deadline: optionalText(120),
  warranty: optionalText(200),
  notes: optionalText(1000),
  costMaterials: number({ min: 0 }),
  costTransport: number({ min: 0 }),
  costTaxPercent: number({ min: 0, max: 100 }),
  costOther: number({ min: 0 }),
  helperDays: number({ min: 0 }),
  helperDailyRate: number({ min: 0 }),
});

const QUOTE_FIELDS = Object.keys(quoteSchema.shape);

const itemSchema = z.object({
  serviceId: z.string().transform((value) => value || null),
  description: z.string().trim().min(1, "descreva o serviço").max(200),
  unit: z.string().trim().min(1, "informe a unidade").max(15),
  quantity: decimalField({ min: 0, minExclusive: true }),
  priceMode: z.enum(["LABOR", "MATERIAL"]),
  unitPrice: decimalField({ min: 0 }),
  hazardous: z.string().transform((value) => value === "1"),
});

const ITEM_LABELS: Record<string, string> = {
  description: "a descrição",
  unit: "a unidade",
  quantity: "a quantidade",
  priceMode: "o tipo de preço",
  unitPrice: "o preço",
};

// Resultado de erro do formulário, sempre com o mesmo formato
function fail(message: string, fieldErrors?: QuoteFormState["fieldErrors"]) {
  return { error: { status: "error", message, fieldErrors } satisfies QuoteFormState };
}

type User = Awaited<ReturnType<typeof requireUser>>;

// Lê e valida o formulário inteiro; devolve os dados prontos para gravar ou o erro
async function parseQuoteForm(formData: FormData, user: User) {
  const result = quoteSchema.safeParse(readForm(formData, QUOTE_FIELDS));
  if (!result.success) {
    return fail("Confira os campos destacados.", z.flattenError(result.error).fieldErrors);
  }
  const { clientId, newClientName, newClientPhone, ...quote } = result.data;

  // Sem a chave "ajudante" ligada, as diárias zeram
  if (formData.get("hasHelper") !== "on") quote.helperDays = "0";

  if (!clientId && newClientName.length < 2) {
    return fail("Escolha o cliente ou digite o nome do novo.");
  }
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId: user.companyId },
    });
    if (!client) return fail("Cliente não encontrado.");
  }

  const columns = {
    serviceId: readList(formData, "itemServiceId"),
    description: readList(formData, "itemDescription"),
    unit: readList(formData, "itemUnit"),
    quantity: readList(formData, "itemQuantity"),
    priceMode: readList(formData, "itemPriceMode"),
    unitPrice: readList(formData, "itemUnitPrice"),
    hazardous: readList(formData, "itemHazardous"),
  };
  if (columns.description.length === 0) {
    return fail("Adicione pelo menos um serviço.");
  }

  const items = [];
  for (let index = 0; index < columns.description.length; index++) {
    const row = Object.fromEntries(
      Object.entries(columns).map(([key, list]) => [key, list[index] ?? ""]),
    );
    const parsed = itemSchema.safeParse(row);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = ITEM_LABELS[String(issue.path[0])] ?? "os dados";
      return fail(`Serviço ${index + 1}: confira ${field} (${issue.message})`);
    }
    items.push({ ...parsed.data, sortOrder: index });
  }

  // As etapas do PDF vêm da tabela de preços, e o serviço precisa ser da mesma empresa
  const serviceIds = [
    ...new Set(items.flatMap((item) => (item.serviceId ? [item.serviceId] : []))),
  ];
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, companyId: user.companyId },
    select: { id: true, steps: true },
  });
  const stepsById = new Map(services.map((service) => [service.id, service.steps]));
  if (services.length !== serviceIds.length) {
    return fail("Algum serviço não foi encontrado.");
  }

  return {
    data: {
      clientId,
      newClient: clientId ? null : { name: newClientName, phone: newClientPhone },
      quote,
      items: items.map((item) => ({
        ...item,
        steps: item.serviceId ? (stepsById.get(item.serviceId) ?? []) : [],
      })),
    },
  };
}

export async function createQuote(
  _state: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const user = await requireUser();
  const parsed = await parseQuoteForm(formData, user);
  if ("error" in parsed) return parsed.error;
  const { clientId, newClient, quote, items } = parsed.data;

  const id = await prisma.$transaction(async (tx) => {
    const finalClientId =
      clientId ||
      (
        await tx.client.create({
          data: { companyId: user.companyId, name: newClient!.name, phone: newClient!.phone },
        })
      ).id;

    // Próximo número da empresa: o increment dentro da transação não deixa repetir
    const company = await tx.company.update({
      where: { id: user.companyId },
      data: { lastQuoteNumber: { increment: 1 } },
      select: { lastQuoteNumber: true, quoteValidityDays: true },
    });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + company.quoteValidityDays);

    const created = await tx.quote.create({
      data: {
        ...quote,
        companyId: user.companyId,
        number: company.lastQuoteNumber,
        clientId: finalClientId,
        createdById: user.id,
        validUntil,
        items: { create: items },
      },
      select: { id: true },
    });
    return created.id;
  });

  revalidatePath("/");
  redirect(`/orcamentos/${id}`);
}

export async function updateQuote(
  _state: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const user = await requireUser();
  const quoteId = String(formData.get("quoteId") ?? "");
  const existing = await prisma.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId },
    select: { id: true },
  });
  if (!existing) return { status: "error", message: "Orçamento não encontrado." };

  const parsed = await parseQuoteForm(formData, user);
  if ("error" in parsed) return parsed.error;
  const { clientId, newClient, quote, items } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const finalClientId =
      clientId ||
      (
        await tx.client.create({
          data: { companyId: user.companyId, name: newClient!.name, phone: newClient!.phone },
        })
      ).id;

    // Troca as linhas inteiras: mais simples e seguro do que comparar uma a uma
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quote.update({
      where: { id: quoteId },
      data: { ...quote, clientId: finalClientId, items: { create: items } },
    });
  });

  revalidatePath("/");
  revalidatePath(`/orcamentos/${quoteId}`);
  redirect(`/orcamentos/${quoteId}`);
}

export async function changeQuoteStatus(formData: FormData) {
  const user = await requireUser();
  const quoteId = String(formData.get("quoteId") ?? "");
  const status = formData.get("status");
  if (!isQuoteStatus(status)) return;

  await prisma.quote.updateMany({
    where: { id: quoteId, companyId: user.companyId },
    data: { status, statusChangedAt: new Date() },
  });

  revalidatePath("/");
  revalidatePath(`/orcamentos/${quoteId}`);
}

// Apagar é para orçamento feito errado ou de teste.
// Cliente que não fechou vai para "Não fechou", para entrar na taxa de fechamento.
export async function deleteQuote(_state: RemoveState, formData: FormData): Promise<RemoveState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const { count } = await prisma.quote.deleteMany({ where: { id, companyId: user.companyId } });
  if (count === 0) return { message: "Orçamento não encontrado." };

  revalidatePath("/");
  redirect("/");
}
