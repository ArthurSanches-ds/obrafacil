"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/simple-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readForm } from "@/lib/form-data";
import { decimalField } from "@/lib/form-fields";

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80, "Máximo de 80 caracteres."),
  unit: z.string().trim().min(1, "Informe a unidade.").max(15, "Máximo de 15 caracteres."),
  laborPrice: decimalField({ min: 0 }),
  materialPrice: decimalField({ min: 0 }),
  // Uma etapa por linha; linhas vazias são ignoradas
  steps: z
    .string()
    .max(5000, "Texto longo demais.")
    .transform((text) =>
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
});

const FIELDS = Object.keys(schema.shape);

function read(formData: FormData) {
  return {
    values: readForm(formData, ["serviceId", ...FIELDS]),
    hazardous: formData.get("hazardous") === "on",
    active: formData.get("active") === "on",
  };
}

function invalid(error: z.ZodError, values: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Confira os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values,
  };
}

function done(): never {
  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function createService(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { values, hazardous } = read(formData);
  const result = schema.safeParse(values);
  if (!result.success) return invalid(result.error, values);

  // Serviço novo vai para o fim da lista
  const last = await prisma.service.findFirst({
    where: { companyId: user.companyId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.service.create({
    data: {
      ...result.data,
      hazardous,
      companyId: user.companyId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  done();
}

// Mudar o preço vale para os próximos orçamentos: os antigos guardaram o preço do dia
export async function updateService(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { values, hazardous, active } = read(formData);
  const result = schema.safeParse(values);
  if (!result.success) return invalid(result.error, values);

  const { count } = await prisma.service.updateMany({
    where: { id: values.serviceId, companyId: user.companyId },
    data: { ...result.data, hazardous, active },
  });
  if (count === 0) return { status: "error", message: "Serviço não encontrado.", values };
  done();
}
