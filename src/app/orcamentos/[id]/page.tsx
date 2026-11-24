import Link from "next/link";
import { notFound } from "next/navigation";
import { RemoveButton } from "@/components/remove-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { QUOTE_STATUSES, STATUS_LABEL } from "@/lib/quote-status";
import { embedHazard } from "@/domain/quote";
import { quoteTotals } from "@/server/quotes";
import { SharePdfButton } from "./share-pdf-button";
import { changeQuoteStatus, deleteQuote } from "../actions";

export const dynamic = "force-dynamic";

const date = (value: Date) => value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function OrcamentoPage({ params }: PageProps<"/orcamentos/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const quote = await prisma.quote.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      client: true,
      company: true,
      createdBy: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) notFound();

  const totals = quoteTotals(quote);
  const whatsapp = whatsappLink(quote.client.phone);

  // No PDF o risco vem embutido no valor dos serviços, sem linha separada
  const pdfLines = embedHazard(
    quote.items.map((item) => ({
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      hazardous: item.hazardous,
    })),
    quote.hazardScope,
    totals,
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Orçamento nº {quote.number}</h1>
          <Badge>{STATUS_LABEL[quote.status]}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {quote.client.name}
          {quote.title && ` · ${quote.title}`}
        </p>
        <p className="text-muted-foreground text-xs">
          Feito em {date(quote.createdAt)} por {quote.createdBy.name}
          {quote.validUntil && ` · válido até ${date(quote.validUntil)}`}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <SharePdfButton
          whatsapp={whatsapp}
          data={{
            company: {
              name: quote.company.name,
              phone: quote.company.phone,
              email: quote.company.email,
              document: quote.company.document,
              address: quote.company.address,
              logoPath: quote.company.logoPath,
            },
            number: quote.number,
            createdAt: date(quote.createdAt),
            validUntil: quote.validUntil ? date(quote.validUntil) : null,
            title: quote.title,
            client: {
              name: quote.client.name,
              phone: quote.client.phone,
              address: quote.client.address,
            },
            lines: quote.items.map((item, index) => ({
              description: item.description,
              quantity: item.quantity.toNumber(),
              unit: item.unit,
              unitPrice: pdfLines[index].div(item.quantity).toDecimalPlaces(2).toNumber(),
              total: pdfLines[index].toNumber(),
              steps: item.steps,
            })),
            subtotal: totals.subtotalWithHazard.toNumber(),
            discount: totals.discountAmount.toNumber(),
            additionalFee: totals.additionalFee.toNumber(),
            total: totals.total.toNumber(),
            paymentTerms: quote.paymentTerms,
            deadline: quote.deadline,
            warranty: quote.warranty,
            notes: quote.notes,
          }}
        />
        <Link
          href={`/orcamentos/${quote.id}/editar`}
          className={buttonVariants({ variant: "outline" })}
        >
          Editar
        </Link>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            WhatsApp do cliente
          </a>
        )}
      </div>

      {/* Mudar a situação: um botão para cada etapa, menos a atual */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Mudar situação</h2>
        <div className="flex flex-wrap gap-2">
          {QUOTE_STATUSES.filter((status) => status !== quote.status).map((status) => (
            <form key={status} action={changeQuoteStatus}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="status" value={status} />
              <Button type="submit" variant="outline" size="sm">
                {STATUS_LABEL[status]}
              </Button>
            </form>
          ))}
        </div>
      </section>

      <Card>
        <CardContent className="space-y-3 text-sm">
          {quote.items.map((item, index) => (
            <div key={item.id} className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{item.description}</p>
                <p className="text-muted-foreground text-xs">
                  {formatNumber(item.quantity, 2)} {item.unit} × {formatMoney(item.unitPrice)} ·{" "}
                  {item.priceMode === "MATERIAL" ? "com material" : "só mão de obra"}
                  {item.hazardous && " · risco"}
                </p>
              </div>
              <span className="shrink-0 tabular-nums">{formatMoney(totals.lines[index])}</span>
            </div>
          ))}

          <div className="space-y-1 border-t pt-3">
            <Line label="Serviços" value={totals.subtotal} />
            {!totals.hazardAmount.isZero() && (
              <Line label="Adicional de risco (embutido no PDF)" value={totals.hazardAmount} />
            )}
            {!totals.discountAmount.isZero() && (
              <Line label="Desconto" value={totals.discountAmount.neg()} />
            )}
            {!totals.additionalFee.isZero() && (
              <Line label="Taxa adicional" value={totals.additionalFee} />
            )}
            <Line label="Total para o cliente" value={totals.total} strong />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 text-sm">
          <h2 className="mb-2 font-medium">Custos e lucro (só vocês veem)</h2>
          <Line label="Material" value={quote.costMaterials} />
          <Line label="Transporte" value={quote.costTransport} />
          {!totals.helperCost.isZero() && (
            <Line
              label={`Ajudante (${formatNumber(quote.helperDays, 1)} diárias)`}
              value={totals.helperCost}
            />
          )}
          <Line label="Imposto" value={totals.taxAmount} />
          <Line label="Outros" value={quote.costOther} />
          <div
            className={`flex justify-between gap-4 border-t pt-1 font-semibold ${
              totals.profit.isNegative() ? "text-destructive" : ""
            }`}
          >
            <span>Lucro</span>
            <span className="tabular-nums">
              {formatMoney(totals.profit)} · {totals.marginPercent.toFixed(1).replace(".", ",")}%
            </span>
          </div>
        </CardContent>
      </Card>

      {(quote.paymentTerms || quote.deadline || quote.warranty || quote.notes) && (
        <Card>
          <CardContent className="space-y-1 text-sm">
            {quote.paymentTerms && <p>Pagamento: {quote.paymentTerms}</p>}
            {quote.deadline && <p>Prazo: {quote.deadline}</p>}
            {quote.warranty && <p>Garantia: {quote.warranty}</p>}
            {quote.notes && <p className="text-muted-foreground">{quote.notes}</p>}
          </CardContent>
        </Card>
      )}

      <section className="space-y-2 border-t pt-6">
        <p className="text-muted-foreground text-sm">
          Cliente desistiu? Use &quot;Não fechou&quot; acima, que entra na conta de quantos
          orçamentos fecham. Excluir é só para orçamento feito errado.
        </p>
        <RemoveButton
          action={deleteQuote}
          id={quote.id}
          label="Excluir orçamento"
          confirmText={`Excluir o orçamento nº ${quote.number}? Não dá para desfazer.`}
        />
      </section>
    </main>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: { toString(): string };
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatMoney(value)}</span>
    </div>
  );
}
