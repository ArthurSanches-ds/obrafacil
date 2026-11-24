import { SimpleForm } from "@/components/simple-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "../actions";
import { clientFields } from "../client-fields";

export default async function NovoClientePage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Novo cliente</h1>
      <div className="mt-6">
        <SimpleForm
          action={createClient}
          fields={clientFields()}
          submitLabel="Cadastrar"
          cancelHref="/clientes"
        />
      </div>
    </main>
  );
}
