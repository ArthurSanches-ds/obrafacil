"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

const FIELDS = [
  { name: "name", label: "Seu nome", type: "text", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "username" },
  {
    name: "password",
    label: "Senha (mínimo 8 caracteres)",
    type: "password",
    autoComplete: "new-password",
  },
  { name: "confirm", label: "Repita a senha", type: "password", autoComplete: "new-password" },
] as const;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {FIELDS.map((field) => {
        const error = state.fieldErrors?.[field.name]?.[0];
        const defaultValue =
          field.name === "name" || field.name === "email" ? state.values?.[field.name] : undefined;

        return (
          <Field key={field.name} data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              defaultValue={defaultValue ?? ""}
              aria-invalid={error ? true : undefined}
              required
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        );
      })}

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
