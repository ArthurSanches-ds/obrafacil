import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandCard } from "@/components/brand-card";
import { getCurrentUser, getMainCompany, isSignupOpen } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  if (await getCurrentUser()) redirect("/");
  const company = await getMainCompany();
  const open = isSignupOpen();

  return (
    <BrandCard
      companyName={company?.name ?? "ObraFácil"}
      logoPath={company?.logoPath ?? null}
      subtitle={open ? "Criar conta" : "Cadastro fechado"}
    >
      {open ? (
        <SignupForm />
      ) : (
        <p className="text-muted-foreground text-center text-sm">
          O cadastro de novas contas está fechado. Fale com o administrador.
        </p>
      )}
      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-medium underline">
          Entrar
        </Link>
      </p>
    </BrandCard>
  );
}
