import { requireUser } from "@/lib/auth";
import { createQuote } from "../actions";
import { emptyQuoteValues, loadFormOptions } from "../form-options";
import { QuoteForm } from "../quote-form";

export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage({ searchParams }: PageProps<"/orcamentos/novo">) {
  const user = await requireUser();
  const { cliente } = await searchParams;
  const { clients, services, company } = await loadFormOptions(user.companyId);

  const initial = emptyQuoteValues(company);
  // Vindo da tela de clientes, o cliente já vem escolhido
  if (typeof cliente === "string" && clients.some((c) => c.id === cliente)) {
    initial.clientId = cliente;
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Novo orçamento</h1>
      <div className="mt-6">
        <QuoteForm
          action={createQuote}
          clients={clients}
          services={services}
          initial={initial}
          submitLabel="Salvar orçamento"
          cancelHref="/"
        />
      </div>
    </main>
  );
}
