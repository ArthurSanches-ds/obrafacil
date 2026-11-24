import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// O cookie só prova quem é a pessoa. Se ela ainda pode entrar, quem diz é o banco:
// assim um usuário bloqueado perde o acesso na hora, mesmo com o cookie válido.
// O cache evita repetir a consulta várias vezes na mesma página.
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, companyId: true, isAdmin: true, active: true },
  });
  if (!user || !user.active) return null;
  return user;
});

// Use em toda página e toda ação: devolve o usuário ou manda para o login
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

// Interruptor do cadastro: CADASTRO_ABERTO="sim" no .env ou na Vercel
export function isSignupOpen() {
  return process.env.CADASTRO_ABERTO === "sim";
}

// Por enquanto o sistema tem uma empresa só; quando virar produto,
// o cadastro passa a criar a empresa ou aceitar convite
export async function getMainCompany() {
  return prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
}
