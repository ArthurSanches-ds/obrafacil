import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { whatsappLink } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const user = await requireUser();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";

  const clients = await prisma.client.findMany({
    where: {
      companyId: user.companyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { address: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: { _count: { select: { quotes: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
            {search && ` encontrados para "${search}"`}
          </p>
        </div>
        <Link href="/clientes/novo" className={buttonVariants()}>
          Novo cliente
        </Link>
      </div>

      {/* Busca simples por formulário GET: funciona até sem JavaScript */}
      <form className="mt-6">
        <Input name="q" defaultValue={search} placeholder="Buscar por nome, telefone ou endereço" />
      </form>

      <div className="mt-4 space-y-3">
        {clients.map((client) => {
          const whatsapp = whatsappLink(client.phone);
          return (
            <Card key={client.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{client.name}</p>
                  {client.address && (
                    <p className="text-muted-foreground truncate text-sm">{client.address}</p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {client._count.quotes} {client._count.quotes === 1 ? "orçamento" : "orçamentos"}
                    {client.origin && ` · veio por ${client.origin}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      WhatsApp
                    </a>
                  )}
                  <Link
                    href={`/orcamentos/novo?cliente=${client.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Orçar
                  </Link>
                  <Link
                    href={`/clientes/${client.id}/editar`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Editar
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {clients.length === 0 && (
        <p className="text-muted-foreground mt-6 text-sm">
          {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
        </p>
      )}
    </main>
  );
}
