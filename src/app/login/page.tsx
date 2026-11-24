import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandCard } from "@/components/brand-card";
import { getCurrentUser, getMainCompany, isSignupOpen } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const company = await getMainCompany();

  return (
    <BrandCard
      companyName={company?.name ?? "ObraFácil"}
      logoPath={company?.logoPath ?? null}
      subtitle="Orçamentos e obras · entre para continuar"
    >
      <LoginForm />
      {isSignupOpen() && (
        <p className="text-muted-foreground text-center text-sm">
          Primeira vez?{" "}
          <Link href="/cadastro" className="text-primary font-medium underline">
            Criar conta
          </Link>
        </p>
      )}
    </BrandCard>
  );
}
