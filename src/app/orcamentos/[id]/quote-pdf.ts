import { formatMoney, formatNumber } from "@/lib/format";

export type QuotePdfData = {
  company: {
    name: string;
    phone: string | null;
    email: string | null;
    document: string | null;
    address: string | null;
    logoPath: string | null;
  };
  number: number;
  createdAt: string; // dd/mm/aaaa
  validUntil: string | null;
  title: string | null;
  client: { name: string; phone: string | null; address: string | null };
  lines: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number; // já com o risco embutido
    total: number;
    steps: string[];
  }[];
  subtotal: number; // serviços com o risco embutido
  discount: number;
  additionalFee: number;
  total: number;
  paymentTerms: string | null;
  deadline: string | null;
  warranty: string | null;
  notes: string | null;
};

type Rgb = [number, number, number];
const BRAND: Rgb = [168, 94, 36]; // cobre do logo, escurecido para ler bem no branco
const DARK: Rgb = [24, 26, 29];
const TEXT: Rgb = [33, 37, 41];
const MUTED: Rgb = [110, 115, 120];
const STRIPE: Rgb = [248, 244, 239];

// As fontes padrão do PDF não têm o espaço especial que o Intl usa depois do "R$"
const money = (value: number) => formatMoney(value).replace(/\s/g, " ");

async function loadImage(path: string) {
  const response = await fetch(path);
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export function quoteFileName(data: QuotePdfData) {
  const slug = data.client.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `orcamento-${data.number}-${slug || "cliente"}.pdf`;
}

// Monta o orçamento em A4, com quebra de página automática.
// A biblioteca só é baixada quando o botão é clicado.
export async function createQuotePdf(data: QuotePdfData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 16;
  const right = width - margin;
  const bottomLimit = height - 22;
  let y = 0;

  // Começa página nova quando o próximo bloco não cabe
  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (
    text: string,
    x: number,
    options: {
      size?: number;
      bold?: boolean;
      color?: Rgb;
      maxWidth?: number;
      lineHeight?: number;
    } = {},
  ) => {
    const size = options.size ?? 10;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? TEXT));
    const lines: string[] = doc.splitTextToSize(text, options.maxWidth ?? right - x);
    const lineHeight = options.lineHeight ?? size * 0.45;
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, x, y);
      y += lineHeight;
    });
  };

  const sectionTitle = (title: string) => {
    ensureSpace(14);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 1.5, right, y + 1.5);
    y += 7;
  };

  // ---------- Cabeçalho escuro com o logo ----------
  doc.setFillColor(...DARK);
  doc.rect(0, 0, width, 42, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 42, width, 1.2, "F");

  const logo = data.company.logoPath ? await loadImage(data.company.logoPath) : null;
  const textX = logo ? margin + 36 : margin;
  if (logo) doc.addImage(logo, "PNG", margin, 5, 32, 32);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.company.name, textX, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const contact = [data.company.phone, data.company.email].filter(Boolean).join(" · ");
  const companyLines = [contact, data.company.address, data.company.document]
    .filter((line): line is string => Boolean(line))
    .slice(0, 3);
  companyLines.forEach((line, index) => doc.text(line, textX, 23 + index * 4.5));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text("ORÇAMENTO", right, 16, { align: "right" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`nº ${data.number}`, right, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Emitido em ${data.createdAt}`, right, 28, { align: "right" });
  if (data.validUntil) doc.text(`Válido até ${data.validUntil}`, right, 33, { align: "right" });

  // ---------- Cliente ----------
  y = 54;
  write("CLIENTE", margin, { size: 8, color: MUTED });
  write(data.client.name, margin, { size: 12, bold: true });
  const clientInfo = [data.client.phone, data.client.address].filter(Boolean).join(" · ");
  if (clientInfo) write(clientInfo, margin, { size: 9, color: MUTED });
  if (data.title) {
    y += 2;
    write(data.title, margin, { size: 10, bold: true, color: BRAND });
  }

  // ---------- Tabela de serviços ----------
  sectionTitle("Serviços");
  const col = { desc: margin + 2, qty: 128, unit: 158, total: right - 2 };
  doc.setFillColor(...STRIPE);
  doc.rect(margin, y - 4.5, right - margin, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("DESCRIÇÃO", col.desc, y);
  doc.text("QTD", col.qty, y, { align: "right" });
  doc.text("VALOR UN.", col.unit, y, { align: "right" });
  doc.text("TOTAL", col.total, y, { align: "right" });
  y += 7;

  data.lines.forEach((line) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const descLines: string[] = doc.splitTextToSize(line.description, col.qty - col.desc - 22);
    ensureSpace(descLines.length * 4.5 + 3);
    doc.setTextColor(...TEXT);
    doc.text(descLines, col.desc, y);
    doc.text(`${formatNumber(line.quantity, 2)} ${line.unit}`, col.qty, y, { align: "right" });
    doc.text(money(line.unitPrice), col.unit, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(money(line.total), col.total, y, { align: "right" });
    y += descLines.length * 4.5 + 1.5;
    doc.setDrawColor(230, 226, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 1, right, y - 1);
    y += 2.5;
  });

  // ---------- Totais ----------
  ensureSpace(30);
  y += 2;
  const totalLine = (label: string, value: string, strong = false) => {
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(strong ? 12 : 9.5);
    doc.setTextColor(...(strong ? BRAND : TEXT));
    doc.text(label, col.unit, y, { align: "right" });
    doc.text(value, col.total, y, { align: "right" });
    y += strong ? 7 : 5;
  };
  if (data.discount > 0 || data.additionalFee > 0) totalLine("Subtotal", money(data.subtotal));
  if (data.discount > 0) totalLine("Desconto", `- ${money(data.discount)}`);
  if (data.additionalFee > 0) totalLine("Taxa adicional", money(data.additionalFee));
  totalLine("TOTAL", money(data.total), true);

  // ---------- Condições ----------
  const conditions = [
    ["Pagamento", data.paymentTerms],
    ["Prazo de execução", data.deadline],
    ["Garantia", data.warranty],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (conditions.length > 0 || data.notes) {
    sectionTitle("Condições");
    conditions.forEach(([label, value]) => {
      write(`${label}: ${value}`, margin, { size: 9.5 });
      y += 1;
    });
    if (data.notes) write(data.notes, margin, { size: 9.5, color: MUTED });
  }

  // ---------- Etapas de cada serviço ----------
  const withSteps = data.lines.filter((line) => line.steps.length > 0);
  if (withSteps.length > 0) {
    sectionTitle("Como o serviço é feito");
    withSteps.forEach((line) => {
      ensureSpace(12);
      write(line.description, margin, { size: 10, bold: true });
      y += 0.5;
      line.steps.forEach((step, index) => {
        write(`${index + 1}. ${step}`, margin + 3, { size: 8.5, color: MUTED, lineHeight: 3.9 });
        y += 0.8;
      });
      y += 2;
    });
  }

  // ---------- Rodapé em todas as páginas ----------
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `${data.company.name} · Orçamento nº ${data.number}${data.validUntil ? ` · válido até ${data.validUntil}` : ""}`,
      margin,
      height - 10,
    );
    doc.text(`${page}/${pages}`, right, height - 10, { align: "right" });
  }

  return doc;
}
