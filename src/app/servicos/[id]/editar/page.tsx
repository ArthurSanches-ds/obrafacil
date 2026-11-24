import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateService } from "../../actions";
import { ServiceForm } from "../../service-form";

export const dynamic = "force-dynamic";

const toInput = (value: { toString(): string }) => value.toString().replace(".", ",");

export default async function EditarServicoPage({ params }: PageProps<"/servicos/[id]/editar">) {
  const user = await requireUser();
  const { id } = await params;
  const service = await prisma.service.findFirst({ where: { id, companyId: user.companyId } });
  if (!service) notFound();

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Editar serviço</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Mudar o preço vale para os próximos orçamentos. Os que já foram feitos não mudam.
      </p>
      <div className="mt-6">
        <ServiceForm
          action={updateService}
          serviceId={service.id}
          submitLabel="Salvar"
          initial={{
            name: service.name,
            unit: service.unit,
            laborPrice: toInput(service.laborPrice),
            materialPrice: toInput(service.materialPrice),
            steps: service.steps.join("\n"),
            hazardous: service.hazardous,
            active: service.active,
          }}
        />
      </div>
    </main>
  );
}
