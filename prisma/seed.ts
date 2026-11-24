import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma";

type ServiceSeed = {
  name: string;
  unit: string;
  laborPrice: string;
  materialPrice: string;
  hazardous: boolean;
  sortOrder: number;
  steps: string[];
};

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

const COMPANY_NAME = "Lameira's Drywall";

async function main() {
  // Empresa: cria só se ainda não existir (pode rodar o seed mais de uma vez)
  let company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        address: "Região dos Lagos / Rio das Ostras - RJ",
        quoteValidityDays: 7,
        helperDailyRate: "120.00",
        logoPath: "/logo-lameiras.png",
      },
    });
    console.log(`Empresa criada: ${company.name}`);
  } else {
    console.log(`Empresa já existia: ${company.name}`);
    if (!company.logoPath) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { logoPath: "/logo-lameiras.png" },
      });
      console.log("Logo adicionado.");
    }
  }

  // Tabela de preços do app antigo: só cria o que ainda não existe, nunca sobrescreve
  // preço que eles já tenham mudado pelo sistema
  const services: ServiceSeed[] = JSON.parse(
    readFileSync(join(__dirname, "seed-data", "services.json"), "utf-8"),
  );
  const existing = await prisma.service.findMany({
    where: { companyId: company.id },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((s) => s.name));
  const missing = services.filter((s) => !existingNames.has(s.name));

  if (missing.length > 0) {
    await prisma.service.createMany({
      data: missing.map((s) => ({ ...s, companyId: company.id })),
    });
  }
  console.log(`Serviços: ${missing.length} criados, ${existingNames.size} já existiam.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
