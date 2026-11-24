import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { isQuoteStatus, QUOTE_STATUSES, STATUS_LABEL } from "@/lib/quote-status";
import { quoteTotals } from "@/server/quotes";

export const dynamic = "force-dynamic";

const date = (value: Date) => value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function OrcamentosPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { situacao } = await searchParams;
  // Sem filtro: tudo menos "Não fechou", que só aparece quando pedido
  const filter = isQuoteStatus(situacao) ? situacao : null;

  const quotes = await prisma.quote.findMany({
    where: {
      companyId: user.companyId,
      status: filter ?? { not: "LOST" },
    },
    include: { client: { select: { name: true } }, items: true },
    orderBy: { number: "desc" },
  });

  const tabs = [
    { key: null, label: "Ativos" },
    ...QUOTE_STATUSES.map((key) => ({ key, label: STATUS_LABEL[key] })),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {quotes.length} {quotes.length === 1 ? "orçamento" : "orçamentos"}
          </p>
        </div>
        <Link href="/orcamentos/novo" className={buttonVariants()}>
          Novo orçamento
        </Link>
      </div>

      <nav className="mt-6 flex [scrollbar-width:none] gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.key ? `/?situacao=${tab.key}` : "/"}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
              tab.key === filter
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-3">
        {quotes.map((quote) => (
          <Link key={quote.id} href={`/orcamentos/${quote.id}`} className="block">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    nº {quote.number} · {quote.client.name}
                  </p>
                  {quote.title && (
                    <p className="text-muted-foreground truncate text-sm">{quote.title}</p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">{date(quote.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">
                    {formatMoney(quoteTotals(quote).total)}
                  </span>
                  <Badge variant={quote.status === "LOST" ? "outline" : "secondary"}>
                    {STATUS_LABEL[quote.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {quotes.length === 0 && (
        <p className="text-muted-foreground mt-6 text-sm">Nenhum orçamento aqui ainda.</p>
      )}
    </main>
  );
}
