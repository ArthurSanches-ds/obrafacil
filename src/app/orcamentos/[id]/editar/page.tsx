import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateQuote } from "../../actions";
import { loadFormOptions } from "../../form-options";
import { QuoteForm } from "../../quote-form";

export const dynamic = "force-dynamic";

const toInput = (value: { toString(): string }) => value.toString().replace(".", ",");

export default async function EditarOrcamentoPage({
  params,
}: PageProps<"/orcamentos/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  const quote = await prisma.quote.findFirst({
    where: { id, companyId: user.companyId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) notFound();

  const { clients, services } = await loadFormOptions(user.companyId);

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Editar orçamento nº {quote.number}</h1>
      <div className="mt-6">
        <QuoteForm
          action={updateQuote}
          quoteId={quote.id}
          clients={clients}
          services={services}
          submitLabel="Salvar alterações"
          cancelHref={`/orcamentos/${quote.id}`}
          initial={{
            clientId: quote.clientId,
            title: quote.title ?? "",
            hazardPercent: toInput(quote.hazardPercent),
            hazardScope: quote.hazardScope,
            discountType: quote.discountType,
            discountValue: toInput(quote.discountValue),
            additionalFee: toInput(quote.additionalFee),
            paymentTerms: quote.paymentTerms ?? "",
            deadline: quote.deadline ?? "",
            warranty: quote.warranty ?? "",
            notes: quote.notes ?? "",
            costMaterials: toInput(quote.costMaterials),
            costTransport: toInput(quote.costTransport),
            costTaxPercent: toInput(quote.costTaxPercent),
            costOther: toInput(quote.costOther),
            hasHelper: !quote.helperDays.isZero(),
            helperDays: toInput(quote.helperDays),
            helperDailyRate: toInput(quote.helperDailyRate),
            items: quote.items.map((item) => ({
              key: item.id,
              serviceId: item.serviceId ?? "",
              description: item.description,
              unit: item.unit,
              quantity: toInput(item.quantity),
              priceMode: item.priceMode,
              unitPrice: toInput(item.unitPrice),
              hazardous: item.hazardous,
            })),
          }}
        />
      </div>
    </main>
  );
}
