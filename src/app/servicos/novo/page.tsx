import { requireUser } from "@/lib/auth";
import { createService } from "../actions";
import { ServiceForm } from "../service-form";

export default async function NovoServicoPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Novo serviço</h1>
      <div className="mt-6">
        <ServiceForm
          action={createService}
          submitLabel="Cadastrar"
          initial={{
            name: "",
            unit: "m²",
            laborPrice: "",
            materialPrice: "",
            steps: "",
            hazardous: false,
            active: true,
          }}
        />
      </div>
    </main>
  );
}
