"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMainCompany, isSignupOpen } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { name: string; email: string };
};

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(60, "Máximo de 60 caracteres.")
      // "arthur sanches" → "Arthur Sanches"
      .transform((value) =>
        value
          .toLocaleLowerCase("pt-BR")
          .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("pt-BR")),
      ),
    email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
    // O bcrypt só aproveita até 72 caracteres
    password: z.string().min(8, "Use pelo menos 8 caracteres.").max(72, "Máximo de 72 caracteres."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "As senhas não são iguais.",
  });

export async function signup(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  // Confere de novo aqui: esconder o botão não basta, alguém pode chamar a ação direto
  if (!isSignupOpen()) return { error: "O cadastro está fechado.", values };

  const result = schema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!result.success) {
    return {
      error: "Confira os campos destacados.",
      fieldErrors: z.flattenError(result.error).fieldErrors,
      values,
    };
  }

  const company = await getMainCompany();
  if (!company) return { error: "Nenhuma empresa cadastrada. Rode o seed.", values };

  const { name, email, password } = result.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Esse e-mail já tem conta. Use a tela de entrar.", values };

  // A primeira pessoa a se cadastrar vira administradora (pode bloquear os outros)
  const usersInCompany = await prisma.user.count({ where: { companyId: company.id } });

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name,
      email,
      passwordHash: await hash(password, 12),
      isAdmin: usersInCompany === 0,
    },
  });

  await createSession({ userId: user.id });
  redirect("/");
}
