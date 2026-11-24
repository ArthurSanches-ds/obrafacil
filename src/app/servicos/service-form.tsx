"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/components/simple-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type ServiceValues = {
  name: string;
  unit: string;
  laborPrice: string;
  materialPrice: string;
  steps: string;
  hazardous: boolean;
  active: boolean;
};

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  serviceId?: string;
  initial: ServiceValues;
  submitLabel: string;
};

const initialState: FormState = { status: "idle" };

const TEXT_FIELDS = [
  { name: "name", label: "Nome do serviço", hint: "Ex.: Drywall — Forro / rebaixamento de teto" },
  { name: "unit", label: "Unidade", hint: "m², m, diária, ponto..." },
  { name: "laborPrice", label: "Preço só mão de obra (R$)", numeric: true },
  { name: "materialPrice", label: "Preço com material (R$)", numeric: true },
] as const;

export function ServiceForm({ action, serviceId, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const value = (name: keyof ServiceValues) => state.values?.[name] ?? String(initial[name]);
  const stepsError = state.fieldErrors?.steps?.[0];

  return (
    <form action={formAction} className="space-y-4">
      {serviceId && <input type="hidden" name="serviceId" value={serviceId} />}

      {TEXT_FIELDS.map((field) => {
        const error = state.fieldErrors?.[field.name]?.[0];
        return (
          <Field key={field.name} data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              defaultValue={value(field.name)}
              inputMode={"numeric" in field ? "decimal" : undefined}
              aria-invalid={error ? true : undefined}
            />
            {"hint" in field && <FieldDescription>{field.hint}</FieldDescription>}
            {error && <FieldError>{error}</FieldError>}
          </Field>
        );
      })}

      <Field data-invalid={stepsError ? true : undefined}>
        <FieldLabel htmlFor="steps">Etapas de execução (aparecem no PDF)</FieldLabel>
        <textarea
          id="steps"
          name="steps"
          rows={8}
          defaultValue={value("steps")}
          className="focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        <FieldDescription>Uma etapa por linha.</FieldDescription>
        {stepsError && <FieldError>{stepsError}</FieldError>}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="hazardous"
          defaultChecked={initial.hazardous}
          className="accent-primary size-4"
        />
        Serviço de risco (altura, produto químico): entra no adicional de risco
      </label>

      {serviceId && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
            className="accent-primary size-4"
          />
          Ativo (desmarcado, some da lista na hora de orçar)
        </label>
      )}

      {state.status === "error" && state.message && (
        <p role="status" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
        <Link href="/servicos" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
