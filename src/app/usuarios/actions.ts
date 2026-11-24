"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/simple-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Só mexe em usuário da mesma empresa
async function findTarget(companyId: string, userId: string) {
  return prisma.user.findFirst({ where: { id: userId, companyId } });
}

// Bloquear / desbloquear e dar / tirar administrador.
// Ninguém mexe em si mesmo: evita o administrador se trancar para fora sem querer.
export async function toggleUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const field = formData.get("field");
  if (userId === admin.id || (field !== "active" && field !== "isAdmin")) return;

  const target = await findTarget(admin.companyId, userId);
  if (!target) return;

  await prisma.user.update({ where: { id: target.id }, data: { [field]: !target[field] } });
  revalidatePath("/usuarios");
}

const capitalize = (value: string) =>
  value
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("pt-BR"));

const editSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome.")
    .max(60, "Máximo de 60 caracteres.")
    .transform(capitalize),
  // Vazio = não troca a senha
  password: z
    .string()
    .refine((value) => value === "" || (value.length >= 8 && value.length <= 72), {
      message: "A senha precisa ter de 8 a 72 caracteres.",
    }),
});

export async function updateUser(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const values = { name: String(formData.get("name") ?? ""), password: "" };

  const target = await findTarget(admin.companyId, userId);
  if (!target) return { status: "error", message: "Usuário não encontrado.", values };

  const result = editSchema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
  });
  if (!result.success) {
    return {
      status: "error",
      message: "Confira os campos destacados.",
      fieldErrors: z.flattenError(result.error).fieldErrors,
      values,
    };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      name: result.data.name,
      ...(result.data.password && { passwordHash: await hash(result.data.password, 12) }),
    },
  });

  revalidatePath("/usuarios");
  revalidatePath("/", "layout");
  redirect("/usuarios");
}
