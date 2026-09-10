// IMPORTS DE BIBLIOTECAS
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// IMPORTS LOCAIS
import { hasRouteAccess } from './config/rbac';

// ROTAS PUBLICAS QUE NAO EXIGEM AUTENTICACAO
const PUBLIC_PATHS = ['/login', '/register'];

// FUNCAO DE PROXY PARA VERIFICAR REQUISICOES
export function proxy(request: any) {
  // OBTENDO O CAMINHO DA REQUISICAO
  const pathname = request.nextUrl.pathname;

  // VERIFICANDO SE DEVE IGNORAR ARQUIVOS ESTATICOS E APIS
  let isIgnoredPath = false;
  if (pathname.startsWith('/_next')) {
    isIgnoredPath = true;
  } else if (pathname.startsWith('/api')) {
    isIgnoredPath = true;
  } else if (pathname.startsWith('/static')) {
    isIgnoredPath = true;
  } else if (pathname.includes('.')) {
    isIgnoredPath = true;
  } else {
    isIgnoredPath = false;
  }

  if (isIgnoredPath) {
    return NextResponse.next();
  }

  // OBTENDO O TOKEN DE AUTENTICACAO DOS COOKIES
  let tokenCookie = undefined;
  const authTokenCookieObj = request.cookies.get('auth_token');
  if (authTokenCookieObj) {
    tokenCookie = authTokenCookieObj.value;
  } else {
    tokenCookie = undefined;
  }

  // OBTENDO O PAPEL DO USUARIO DOS COOKIES
  let roleCookie = undefined;
  const roleCookieObj = request.cookies.get('user_role');
  if (roleCookieObj) {
    roleCookie = roleCookieObj.value;
  } else {
    roleCookie = undefined;
  }

  // VERIFICANDO SE A ROTA ATUAL E PUBLICA
  const isPublicPath = PUBLIC_PATHS.some((path) => {
    let match = false;
    if (pathname === path) {
      match = true;
    } else if (pathname.startsWith(`${path}/`)) {
      match = true;
    } else {
      match = false;
    }
    return match;
  });

  // CASO 1: USUARIO NAO AUTENTICADO TENTANDO ACESSAR ROTA PRIVADA
  if (!tokenCookie) {
    if (!isPublicPath) {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  // CASO 2: USUARIO AUTENTICADO TENTANDO ACESSAR LOGIN OU CADASTRO
  if (tokenCookie) {
    if (isPublicPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // CASO 3: USUARIO AUTENTICADO ACESSANDO ROTA PROTEGIDA
  if (tokenCookie) {
    if (!isPublicPath) {
      if (pathname !== '/') {
        // DEFININDO O PAPEL DO USUARIO
        let userRole: string | null = null;
        if (roleCookie) {
          userRole = decodeURIComponent(roleCookie);
        } else {
          userRole = null;
        }

        // VERIFICANDO PERMISSAO DE ACESSO A ROTA
        if (userRole) {
          const hasAccess = hasRouteAccess(userRole, pathname);
          if (!hasAccess) {
            const dashboardUrl = new URL('/dashboard', request.url);
            dashboardUrl.searchParams.set('denied', '1');
            return NextResponse.redirect(dashboardUrl);
          }
        }
      }
    }
  }

  return NextResponse.next();
}

// CONFIGURACAO DO MATCHER
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};