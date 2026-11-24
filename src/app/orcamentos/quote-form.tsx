"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { calculateQuote } from "@/domain/quote";
import { formatMoney } from "@/lib/format";
import { parseBrazilianNumber } from "@/lib/parse-number";
import type { QuoteFormState } from "./actions";

export type ServiceOption = {
  id: string;
  name: string;
  unit: string;
  laborPrice: string;
  materialPrice: string;
  hazardous: boolean;
};

export type ItemRow = {
  key: string;
  serviceId: string; // vazio = item avulso
  description: string;
  unit: string;
  quantity: string;
  priceMode: "LABOR" | "MATERIAL";
  unitPrice: string;
  hazardous: boolean;
};

export type QuoteFormValues = {
  clientId: string;
  title: string;
  hazardPercent: string;
  hazardScope: "ALL" | "MARKED";
  discountType: "PERCENT" | "AMOUNT";
  discountValue: string;
  additionalFee: string;
  paymentTerms: string;
  deadline: string;
  warranty: string;
  notes: string;
  costMaterials: string;
  costTransport: string;
  costTaxPercent: string;
  costOther: string;
  hasHelper: boolean;
  helperDays: string;
  helperDailyRate: string;
  items: ItemRow[];
};

type Props = {
  action: (state: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
  quoteId?: string;
  clients: { id: string; name: string }[];
  services: ServiceOption[];
  initial: QuoteFormValues;
  submitLabel: string;
  cancelHref: string;
};

const NEW_CLIENT = "__novo";
const initialState: QuoteFormState = { status: "idle" };
const selectClass =
  "h-9 w-full min-w-0 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Para a prévia: número inválido ou vazio conta como zero
const num = (value: string) => parseBrazilianNumber(value) ?? "0";
const toInput = (value: string) => value.replace(".", ",");
const newKey = () => Math.random().toString(36).slice(2);

export function QuoteForm({
  action,
  quoteId,
  clients,
  services,
  initial,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState(initial);
  const [items, setItems] = useState(initial.items);
  const [clientChoice, setClientChoice] = useState(initial.clientId || NEW_CLIENT);
  const [servicePicker, setServicePicker] = useState("");

  const set =
    (name: keyof QuoteFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [name]: event.target.value }));

  const updateItem = (key: string, patch: Partial<ItemRow>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const addService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((current) => [
      ...current,
      {
        key: newKey(),
        serviceId: service.id,
        description: service.name,
        unit: service.unit,
        quantity: "",
        priceMode: "LABOR",
        unitPrice: toInput(service.laborPrice),
        hazardous: service.hazardous,
      },
    ]);
    setServicePicker("");
  };

  const addLooseItem = () =>
    setItems((current) => [
      ...current,
      {
        key: newKey(),
        serviceId: "",
        description: "",
        unit: "un",
        quantity: "",
        priceMode: "LABOR",
        unitPrice: "",
        hazardous: false,
      },
    ]);

  // Trocar entre "só mão de obra" e "com material" puxa o preço da tabela
  const changePriceMode = (item: ItemRow, priceMode: ItemRow["priceMode"]) => {
    const service = services.find((s) => s.id === item.serviceId);
    updateItem(item.key, {
      priceMode,
      ...(service && {
        unitPrice: toInput(priceMode === "LABOR" ? service.laborPrice : service.materialPrice),
      }),
    });
  };

  // Mesma função testada que o servidor usa, rodando enquanto você digita
  let totals: ReturnType<typeof calculateQuote> | null = null;
  try {
    totals = calculateQuote({
      items: items.map((item) => ({
        quantity: num(item.quantity),
        unitPrice: num(item.unitPrice),
        hazardous: item.hazardous,
      })),
      hazardPercent: num(values.hazardPercent),
      hazardScope: values.hazardScope,
      discountType: values.discountType,
      discountValue: num(values.discountValue),
      additionalFee: num(values.additionalFee),
      costs: {
        materials: num(values.costMaterials),
        transport: num(values.costTransport),
        taxPercent: num(values.costTaxPercent),
        other: num(values.costOther),
        helperDays: values.hasHelper ? num(values.helperDays) : "0",
        helperDailyRate: num(values.helperDailyRate),
      },
    });
  } catch {
    totals = null;
  }

  const error = (name: string) => state.fieldErrors?.[name]?.[0];

  const textField = (
    name: keyof QuoteFormValues,
    label: string,
    options: { hint?: string; numeric?: boolean; placeholder?: string } = {},
  ) => (
    <Field data-invalid={error(name) ? true : undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        value={String(values[name])}
        onChange={set(name)}
        inputMode={options.numeric ? "decimal" : undefined}
        placeholder={options.placeholder}
        aria-invalid={error(name) ? true : undefined}
      />
      {options.hint && <FieldDescription>{options.hint}</FieldDescription>}
      {error(name) && <FieldError>{error(name)}</FieldError>}
    </Field>
  );

  return (
    <form action={formAction} className="space-y-6">
      {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}

      {/* ---------- Cliente ---------- */}
      <Section title="1. Cliente e obra">
        <Field>
          <FieldLabel htmlFor="clientId">Cliente</FieldLabel>
          <select
            id="clientId"
            value={clientChoice}
            onChange={(event) => setClientChoice(event.target.value)}
            className={selectClass}
          >
            <option value={NEW_CLIENT}>+ Cliente novo</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input
            type="hidden"
            name="clientId"
            value={clientChoice === NEW_CLIENT ? "" : clientChoice}
          />
        </Field>

        {clientChoice === NEW_CLIENT && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="newClientName">Nome do cliente novo</FieldLabel>
              <Input id="newClientName" name="newClientName" />
            </Field>
            <Field>
              <FieldLabel htmlFor="newClientPhone">WhatsApp</FieldLabel>
              <Input id="newClientPhone" name="newClientPhone" placeholder="(22) 99999-9999" />
            </Field>
          </div>
        )}
        {clientChoice !== NEW_CLIENT && (
          <>
            <input type="hidden" name="newClientName" value="" />
            <input type="hidden" name="newClientPhone" value="" />
          </>
        )}

        {textField("title", "Título (opcional)", { placeholder: "Ex.: Forro da sala e cozinha" })}
      </Section>

      {/* ---------- Serviços ---------- */}
      <Section title="2. Serviços">
        {items.map((item, index) => (
          <div key={item.key} className="space-y-3 rounded-lg border p-3">
            <input type="hidden" name="itemServiceId" value={item.serviceId} />
            <input type="hidden" name="itemHazardous" value={item.hazardous ? "1" : "0"} />
            <input type="hidden" name="itemPriceMode" value={item.priceMode} />

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium">Serviço {index + 1}</span>
              <button
                type="button"
                onClick={() => setItems((current) => current.filter((i) => i.key !== item.key))}
                className="text-destructive text-xs hover:underline"
              >
                Remover
              </button>
            </div>

            <Input
              name="itemDescription"
              value={item.description}
              onChange={(event) => updateItem(item.key, { description: event.target.value })}
              placeholder="Descrição do serviço"
              aria-label="Descrição"
            />

            <div className="grid grid-cols-3 gap-2">
              <Field>
                <FieldLabel className="text-xs">Quantidade</FieldLabel>
                <Input
                  name="itemQuantity"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs">Unidade</FieldLabel>
                <Input
                  name="itemUnit"
                  value={item.unit}
                  onChange={(event) => updateItem(item.key, { unit: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs">Preço (R$)</FieldLabel>
                <Input
                  name="itemUnitPrice"
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              {item.serviceId ? (
                <select
                  value={item.priceMode}
                  onChange={(event) =>
                    changePriceMode(item, event.target.value as ItemRow["priceMode"])
                  }
                  className={`${selectClass} w-auto`}
                  aria-label="Tipo de preço"
                >
                  <option value="LABOR">Só mão de obra</option>
                  <option value="MATERIAL">Com material</option>
                </select>
              ) : (
                <span className="text-muted-foreground text-xs">Item avulso</span>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.hazardous}
                  onChange={(event) => updateItem(item.key, { hazardous: event.target.checked })}
                  className="accent-primary size-4"
                />
                Risco
              </label>
              <span className="font-medium tabular-nums">
                {totals ? formatMoney(totals.lines[index]) : "—"}
              </span>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <select
            value={servicePicker}
            onChange={(event) => addService(event.target.value)}
            className={`${selectClass} flex-1`}
            aria-label="Adicionar serviço da tabela"
          >
            <option value="">+ Adicionar serviço da tabela</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={addLooseItem}>
            + Item avulso
          </Button>
        </div>
      </Section>

      {/* ---------- Valores ---------- */}
      <Section title="3. Risco, desconto e taxa">
        <div className="grid grid-cols-2 gap-3">
          {textField("hazardPercent", "Adicional de risco (%)", { numeric: true })}
          <Field>
            <FieldLabel htmlFor="hazardScope">Aplicar sobre</FieldLabel>
            <select
              id="hazardScope"
              name="hazardScope"
              value={values.hazardScope}
              onChange={set("hazardScope")}
              className={selectClass}
            >
              <option value="MARKED">Só serviços de risco</option>
              <option value="ALL">Todos os serviços</option>
            </select>
          </Field>
          {textField("discountValue", "Desconto", { numeric: true })}
          <Field>
            <FieldLabel htmlFor="discountType">Tipo de desconto</FieldLabel>
            <select
              id="discountType"
              name="discountType"
              value={values.discountType}
              onChange={set("discountType")}
              className={selectClass}
            >
              <option value="PERCENT">Em %</option>
              <option value="AMOUNT">Em R$</option>
            </select>
          </Field>
        </div>
        {textField("additionalFee", "Taxa adicional (R$)", {
          numeric: true,
          hint: "Valor fixo somado no fim. Ex.: deslocamento para outra cidade.",
        })}
      </Section>

      {/* ---------- Condições ---------- */}
      <Section title="4. Pagamento, prazo e garantia">
        {textField("paymentTerms", "Forma de pagamento", {
          placeholder: "Ex.: 50% de entrada e 50% na entrega",
        })}
        {textField("deadline", "Prazo de execução", { placeholder: "Ex.: 5 dias úteis" })}
        {textField("warranty", "Garantia", { placeholder: "Ex.: 90 dias sobre o serviço" })}
        <Field>
          <FieldLabel htmlFor="notes">Observações para o cliente</FieldLabel>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={values.notes}
            onChange={set("notes")}
            className="focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2"
          />
        </Field>
      </Section>

      {/* ---------- Custos internos ---------- */}
      <Section title="5. Custos da obra (o cliente não vê)">
        <div className="grid grid-cols-2 gap-3">
          {textField("costMaterials", "Material (R$)", { numeric: true })}
          {textField("costTransport", "Transporte (R$)", { numeric: true })}
          {textField("costTaxPercent", "Imposto (%)", { numeric: true })}
          {textField("costOther", "Outros (R$)", { numeric: true })}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="hasHelper"
            checked={values.hasHelper}
            onChange={(event) =>
              setValues((current) => ({ ...current, hasHelper: event.target.checked }))
            }
            className="accent-primary size-4"
          />
          Tem ajudante nessa obra
        </label>
        {values.hasHelper ? (
          <div className="grid grid-cols-2 gap-3">
            {textField("helperDays", "Diárias do ajudante", { numeric: true })}
            {textField("helperDailyRate", "Valor da diária (R$)", { numeric: true })}
          </div>
        ) : (
          <>
            <input type="hidden" name="helperDays" value="0" />
            <input type="hidden" name="helperDailyRate" value={values.helperDailyRate} />
          </>
        )}
      </Section>

      {/* ---------- Resumo ---------- */}
      {totals && (
        <Card className="border-primary/40 sticky bottom-2 shadow-lg">
          <CardContent className="space-y-1 text-sm">
            <Row label="Serviços" value={totals.subtotal} />
            {!totals.hazardAmount.isZero() && (
              <Row label="Adicional de risco" value={totals.hazardAmount} />
            )}
            {!totals.discountAmount.isZero() && (
              <Row label="Desconto" value={totals.discountAmount.neg()} />
            )}
            {!totals.additionalFee.isZero() && (
              <Row label="Taxa adicional" value={totals.additionalFee} />
            )}
            <Row label="Total para o cliente" value={totals.total} strong />
            <div className="text-muted-foreground flex justify-between gap-4 border-t pt-1">
              <span>Lucro (depois dos custos)</span>
              <span
                className={`tabular-nums ${totals.profit.isNegative() ? "text-destructive" : ""}`}
              >
                {formatMoney(totals.profit)} · {totals.marginPercent.toFixed(1).replace(".", ",")}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b pb-2 font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Row({
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
