import { notFound } from "next/navigation";
import { RemoveButton } from "@/components/remove-button";
import { SimpleForm } from "@/components/simple-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteClient, updateClient } from "../../actions";
import { clientFields } from "../../client-fields";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  const client = await prisma.client.findFirst({ where: { id, companyId: user.companyId } });
  if (!client) notFound();

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Editar cliente</h1>
      <div className="mt-6">
        <SimpleForm
          action={updateClient}
          hidden={{ clientId: client.id }}
          fields={clientFields(client)}
          submitLabel="Salvar"
          cancelHref="/clientes"
        />
      </div>

      <section className="mt-10 space-y-2 border-t pt-6">
        <h2 className="font-medium">Excluir cliente</h2>
        <p className="text-muted-foreground text-sm">
          Só dá para excluir cliente sem orçamento. Use para cadastro de teste ou feito errado.
        </p>
        <RemoveButton
          action={deleteClient}
          id={client.id}
          label="Excluir"
          confirmText={`Excluir ${client.name}? Não dá para desfazer.`}
        />
      </section>
    </main>
  );
}
