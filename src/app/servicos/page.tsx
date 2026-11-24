import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const user = await requireUser();
  const services = await prisma.service.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
  });

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tabela de preços</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Mudanças valem para os próximos orçamentos.
          </p>
        </div>
        <Link href="/servicos/novo" className={buttonVariants()}>
          Novo serviço
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {services.map((service) => (
          <Card key={service.id} className={service.active ? undefined : "opacity-60"}>
            <CardContent className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{service.name}</p>
                <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                  {formatMoney(service.laborPrice)} só mão de obra ·{" "}
                  {formatMoney(service.materialPrice)} com material · por {service.unit}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {service.hazardous && <Badge>Risco</Badge>}
                  {!service.active && <Badge variant="outline">Inativo</Badge>}
                  <Badge variant="secondary">{service.steps.length} etapas</Badge>
                </div>
              </div>
              <Link
                href={`/servicos/${service.id}/editar`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Editar
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
