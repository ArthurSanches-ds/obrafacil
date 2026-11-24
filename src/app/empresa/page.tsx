import { SimpleForm } from "@/components/simple-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateCompany } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmpresaPage() {
  const user = await requireAdmin();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Dados da empresa</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Aparecem no cabeçalho do PDF. Os textos padrão já vêm preenchidos em todo orçamento novo.
      </p>
      <div className="mt-6">
        <SimpleForm
          action={updateCompany}
          submitLabel="Salvar"
          cancelHref="/"
          fields={[
            { name: "name", label: "Nome", defaultValue: company.name },
            {
              name: "phone",
              label: "Telefone / WhatsApp",
              defaultValue: company.phone ?? "",
              hint: "Ex.: (22) 99203-1528 / (22) 99885-3729",
            },
            { name: "email", label: "E-mail", defaultValue: company.email ?? "" },
            { name: "document", label: "CNPJ ou CPF", defaultValue: company.document ?? "" },
            { name: "address", label: "Cidade / região", defaultValue: company.address ?? "" },
            {
              name: "defaultPaymentTerms",
              label: "Pagamento padrão",
              defaultValue: company.defaultPaymentTerms ?? "",
              hint: "Ex.: 50% de entrada e 50% na entrega",
            },
            {
              name: "defaultDeadline",
              label: "Prazo padrão",
              defaultValue: company.defaultDeadline ?? "",
            },
            {
              name: "defaultWarranty",
              label: "Garantia padrão",
              defaultValue: company.defaultWarranty ?? "",
              hint: "Ex.: 90 dias sobre o serviço executado",
            },
            {
              name: "quoteValidityDays",
              label: "Validade do orçamento (dias)",
              defaultValue: String(company.quoteValidityDays),
              numeric: true,
            },
            {
              name: "helperDailyRate",
              label: "Diária padrão do ajudante (R$)",
              defaultValue: company.helperDailyRate.toString().replace(".", ","),
              numeric: true,
            },
          ]}
        />
      </div>
    </main>
  );
}
