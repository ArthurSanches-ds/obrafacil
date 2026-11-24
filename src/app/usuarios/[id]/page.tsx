import { notFound } from "next/navigation";
import { SimpleForm } from "@/components/simple-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUser } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarUsuarioPage({ params }: PageProps<"/usuarios/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findFirst({ where: { id, companyId: admin.companyId } });
  if (!user) notFound();

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Editar usuário</h1>
      <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
      <div className="mt-6">
        <SimpleForm
          action={updateUser}
          hidden={{ userId: user.id }}
          submitLabel="Salvar"
          cancelHref="/usuarios"
          fields={[
            { name: "name", label: "Nome", defaultValue: user.name },
            {
              name: "password",
              label: "Nova senha (opcional)",
              defaultValue: "",
              hint: "Deixe vazio para manter a senha atual. Use quando alguém esquecer a senha.",
            },
          ]}
        />
      </div>
    </main>
  );
}
