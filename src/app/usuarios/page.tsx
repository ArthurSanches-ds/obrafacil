import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSignupOpen, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    where: { companyId: admin.companyId },
    orderBy: { createdAt: "asc" },
  });
  const signupOpen = isSignupOpen();

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Usuários</h1>
      <p
        className={`mt-1 text-sm ${signupOpen ? "text-destructive font-medium" : "text-muted-foreground"}`}
      >
        {signupOpen
          ? "Cadastro ABERTO: qualquer pessoa com o link consegue criar conta. Feche assim que todos entrarem."
          : "Cadastro fechado. Para alguém novo entrar, abra o cadastro na Vercel e feche depois."}
      </p>

      <div className="mt-6 space-y-3">
        {users.map((user) => {
          const isMe = user.id === admin.id;
          return (
            <Card key={user.id} className={user.active ? undefined : "opacity-60"}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {user.name} {isMe && <span className="text-muted-foreground">(você)</span>}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {user.isAdmin && <Badge>Administrador</Badge>}
                    {!user.active && <Badge variant="destructive">Bloqueado</Badge>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/usuarios/${user.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Editar nome / senha
                  </Link>
                  {!isMe && (
                    <>
                      <form action={toggleUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="field" value="active" />
                        <Button
                          type="submit"
                          size="sm"
                          variant={user.active ? "destructive" : "outline"}
                        >
                          {user.active ? "Bloquear" : "Desbloquear"}
                        </Button>
                      </form>
                      <form action={toggleUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="field" value="isAdmin" />
                        <Button type="submit" size="sm" variant="ghost">
                          {user.isAdmin ? "Tirar administrador" : "Tornar administrador"}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
