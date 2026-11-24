import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { logout } from "./login/actions";

export const dynamic = "force-dynamic";

// Tela provisória: vira a lista de orçamentos no próximo passo
export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-primary text-3xl font-bold">Olá, {user.name}!</h1>
        <p className="text-muted-foreground mt-1">
          {user.email} · {user.isAdmin ? "administrador" : "usuário"}
        </p>
      </div>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </main>
  );
}
