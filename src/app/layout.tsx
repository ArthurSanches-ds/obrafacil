import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainNav } from "@/components/main-nav";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ObraFácil",
  description: "Orçamentos e obras para empresas de reforma e drywall",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const company = user
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true, logoPath: true },
      })
    : null;

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <MainNav
          userName={user?.name ?? null}
          isAdmin={user?.isAdmin ?? false}
          companyName={company?.name ?? "ObraFácil"}
          logoPath={company?.logoPath ?? null}
        />
        {children}
      </body>
    </html>
  );
}
