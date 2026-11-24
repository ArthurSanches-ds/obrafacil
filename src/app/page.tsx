import { Button } from "@/components/ui/button";

// Tela provisória só para conferir as cores; vira a lista de orçamentos depois
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-primary text-3xl font-bold">ObraFácil</h1>
        <p className="text-muted-foreground mt-1">Lameira&apos;s Drywall · teste de cores</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button>Novo orçamento</Button>
        <Button variant="outline">Clientes</Button>
        <Button variant="secondary">Tabela de preços</Button>
        <Button variant="destructive">Excluir</Button>
      </div>
    </main>
  );
}
