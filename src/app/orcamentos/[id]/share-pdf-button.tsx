"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createQuotePdf, quoteFileName, type QuotePdfData } from "./quote-pdf";

type Props = { data: QuotePdfData; whatsapp: string | null };

// No celular abre o compartilhar (escolhe o WhatsApp e o cliente).
// No PC baixa o PDF e abre a conversa do cliente para anexar.
export function SharePdfButton({ data, whatsapp }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const share = async () => {
    setBusy(true);
    setError("");
    try {
      const doc = await createQuotePdf(data);
      const fileName = quoteFileName(data);
      const file = new File([doc.output("blob")], fileName, { type: "application/pdf" });
      const isPhone = window.matchMedia("(pointer: coarse)").matches;

      if (isPhone && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Orçamento nº ${data.number}` });
      } else {
        doc.save(fileName);
        if (whatsapp) window.open(whatsapp, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      // Fechar a janela de compartilhar sem escolher nada não é erro
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Não foi possível gerar o PDF.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button type="button" onClick={share} disabled={busy}>
        {busy ? "Gerando PDF..." : "Enviar PDF"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
