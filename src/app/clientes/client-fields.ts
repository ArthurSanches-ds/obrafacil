import type { FormFieldConfig } from "@/components/simple-form";

type ClientValues = {
  name?: string;
  phone?: string | null;
  address?: string | null;
  origin?: string | null;
  notes?: string | null;
};

// Mesmos campos no cadastro e na edição
export function clientFields(client: ClientValues = {}): FormFieldConfig[] {
  return [
    { name: "name", label: "Nome", defaultValue: client.name ?? "" },
    {
      name: "phone",
      label: "WhatsApp",
      defaultValue: client.phone ?? "",
      hint: "Com DDD. Ex.: (22) 99812-4410",
    },
    {
      name: "address",
      label: "Endereço da obra",
      defaultValue: client.address ?? "",
      hint: "Rua, número e bairro",
    },
    {
      name: "origin",
      label: "Como conheceu a empresa",
      defaultValue: client.origin ?? "",
      hint: "Ex.: Instagram, indicação, Google",
    },
    { name: "notes", label: "Observações", defaultValue: client.notes ?? "" },
  ];
}
