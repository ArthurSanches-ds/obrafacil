"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/simple-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readForm } from "@/lib/form-data";
import { decimalField, integerField } from "@/lib/form-fields";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((value) => value || null);

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80, "Máximo de 80 caracteres."),
  phone: optional(60),
  email: optional(80),
  document: optional(30),
  address: optional(160),
  defaultPaymentTerms: optional(500),
  defaultDeadline: optional(120),
  defaultWarranty: optional(200),
  quoteValidityDays: integerField({ min: 1, max: 90 }),
  helperDailyRate: decimalField({ min: 0 }),
});

const FIELDS = Object.keys(schema.shape);

export async function updateCompany(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = readForm(formData, FIELDS);
  const result = schema.safeParse(values);
  if (!result.success) {
    return {
      status: "error",
      message: "Confira os campos destacados.",
      fieldErrors: z.flattenError(result.error).fieldErrors,
      values,
    };
  }

  await prisma.company.update({ where: { id: user.companyId }, data: result.data });
  revalidatePath("/", "layout");
  return { status: "idle", message: "Salvo!", values };
}
