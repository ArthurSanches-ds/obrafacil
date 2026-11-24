"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

type Props = {
  userName: string | null;
  isAdmin: boolean;
  companyName: string;
  logoPath: string | null;
};

const LINKS = [
  { href: "/", label: "Orçamentos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/servicos", label: "Preços" },
];

const ADMIN_LINKS = [{ href: "/empresa", label: "Empresa" }];

export function MainNav({ userName, isAdmin, companyName, logoPath }: Props) {
  const pathname = usePathname();

  // Nas telas de entrar e criar conta não tem menu
  if (!userName || pathname === "/login" || pathname === "/cadastro") return null;

  // "/clientes/abc/editar" também conta como estar em "Clientes"
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS;

  return (
    <header className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2">
        {/* Só os links deslizam; o nome e o Sair ficam sempre visíveis */}
        <nav className="flex min-w-0 flex-1 [scrollbar-width:none] items-center gap-1 overflow-x-auto">
          <Link href="/" className="mr-2 flex shrink-0 items-center" aria-label={companyName}>
            {logoPath ? (
              <Image src={logoPath} alt="" width={36} height={36} className="size-9" />
            ) : (
              <span className="text-primary font-bold">{companyName}</span>
            )}
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="flex shrink-0 items-center gap-2 border-l pl-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">{userName}</span>
          <button type="submit" className="hover:bg-muted rounded-md border px-3 py-1.5 text-sm">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
