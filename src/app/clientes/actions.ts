"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { RemoveState } from "@/components/remove-button";
import type { FormState } from "@/components/simple-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readForm } from "@/lib/form-data";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((value) => value || null);

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80, "Máximo de 80 caracteres."),
  phone: optional(30),
  address: optional(160),
  origin: optional(40),
  notes: optional(500),
});

const FIELDS = Object.keys(schema.shape);

function invalid(error: z.ZodError, values: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Confira os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values,
  };
}

export async function createClient(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = readForm(formData, FIELDS);
  const result = schema.safeParse(values);
  if (!result.success) return invalid(result.error, values);

  await prisma.client.create({ data: { ...result.data, companyId: user.companyId } });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateClient(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = readForm(formData, ["clientId", ...FIELDS]);
  const result = schema.safeParse(values);
  if (!result.success) return invalid(result.error, values);

  // updateMany com companyId: ninguém altera cliente de outra empresa trocando o id na página
  const { count } = await prisma.client.updateMany({
    where: { id: values.clientId, companyId: user.companyId },
    data: result.data,
  });
  if (count === 0) return { status: "error", message: "Cliente não encontrado.", values };

  revalidatePath("/clientes");
  redirect("/clientes");
}

// Só apaga cliente sem orçamento: com orçamento, apagar sumiria com o histórico.
// Para cliente de teste, exclua os orçamentos dele antes.
export async function deleteClient(_state: RemoveState, formData: FormData): Promise<RemoveState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const client = await prisma.client.findFirst({
    where: { id, companyId: user.companyId },
    include: { _count: { select: { quotes: true } } },
  });
  if (!client) return { message: "Cliente não encontrado." };

  const quotes = client._count.quotes;
  if (quotes > 0) {
    return {
      message: `${client.name} tem ${quotes} ${quotes === 1 ? "orçamento" : "orçamentos"}. Exclua ${quotes === 1 ? "o orçamento" : "os orçamentos"} antes, ou mantenha o cliente para não perder o histórico.`,
    };
  }

  await prisma.client.delete({ where: { id: client.id } });
  revalidatePath("/clientes");
  redirect("/clientes");
}
