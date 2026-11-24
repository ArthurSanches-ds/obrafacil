import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/session";

// Únicas páginas que não exigem login
const PUBLIC_PATHS = ["/login", "/cadastro"];

// Primeira barreira: sem cookie válido, nem chega na página.
// A segunda é o requireUser, que confere no banco se o usuário não foi bloqueado.
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

// Roda em tudo, menos nos arquivos internos do Next e nos arquivos com extensão (.png, .ico...)
export const config = {
  matcher: ["/((?!_next/|__nextjs|.*\\..*).*)"],
};
