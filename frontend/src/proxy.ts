// imports de bibliotecas
import { NextResponse } from 'next/server';

// imports locais
import { hasRouteAccess, rolePermissions } from './config/rbac';

// rotas publicas que nao exigem autenticacao.
const PUBLIC_PATHS = ['/login', '/register'];

// papeis reconhecidos pelo rbac. usados como base pro fail-closed
// de papel desconhecido: qualquer coisa fora dessa lista e tratada
// como nao autorizado.
const KNOWN_ROLES = Object.keys(rolePermissions);

// funcao de proxy executada pelo next em toda
// requisicao que bate no matcher. faz tres checagens em ordem:
// 1) libera a landing e as rotas publicas; sem token, redireciona
//    as demais rotas pro login (com ?redirect= pra voltar depois).
// 2) se o usuario esta autenticado e tenta acessar a landing,
//    login ou cadastro, joga ele pro dashboard.
// 3) se esta autenticado numa rota privada, resolve o papel e
//    checa se ele tem acesso aquela rota via hasrouteaccess.
export function proxy(request: any) {
  // caminho da requisicao, base de quase todas as decisoes abaixo.
  const pathname = request.nextUrl.pathname;
  const isLanding = pathname === '/';

  // pula arquivos estaticos e rotas da api: esses nao passam por
  // auth aqui, porque a api ja tem middleware proprio e estaticos
  // nao precisam de sessao.
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

  // le o token do cookie. e o que define se o usuario esta
  // autenticado nesse primeiro nivel.
  let tokenCookie = undefined;
  const authTokenCookieObj = request.cookies.get('auth_token');
  if (authTokenCookieObj) {
    tokenCookie = authTokenCookieObj.value;
  } else {
    tokenCookie = undefined;
  }

  // le o papel do cookie. usado na checagem de acesso da rota.
  let roleCookie = undefined;
  const roleCookieObj = request.cookies.get('user_role');
  if (roleCookieObj) {
    roleCookie = roleCookieObj.value;
  } else {
    roleCookie = undefined;
  }

  // resolve se a rota atual e publica (login ou register) olhando
  // tanto o caminho exato quanto subcaminhos (ex: /login/xxx).
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

  // caso 1: usuario nao autenticado tentando acessar rota privada.
  // manda pro login com ?redirect= pra voltar pra onde tentou.
  if (!tokenCookie) {
    if (!isPublicPath && !isLanding) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // caso 2: usuario autenticado vai direto ao dashboard ao acessar
  // a landing, login ou cadastro.
  if (tokenCookie) {
    if (isPublicPath || isLanding) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // caso 3: usuario autenticado acessando rota protegida. aqui
  // resolvemos o papel e checamos acesso via rbac.
  if (tokenCookie) {
    if (!isPublicPath && !isLanding) {
      // resolve o papel do cookie. normaliza em maiusculo e
      // trim, e considera invalido quando decodifica pra string
      // vazia.
      let userRole: string | null = null;
      if (roleCookie) {
        const decodedRole = decodeURIComponent(roleCookie).trim().toUpperCase();
        if (decodedRole !== '') {
          userRole = decodedRole;
        }
      }

      // fail-closed: sem papel valido nao existe autorizacao.
      // antes, um user_role ausente ou vazio pulava a checagem
      // de permissao e liberava a rota pra qualquer um.
      const isKnownRole = userRole !== null && KNOWN_ROLES.includes(userRole);
      if (!isKnownRole) {
        // limpa as credenciais invalidas pra evitar loop com
        // /login (que redireciona pro /dashboard quando o token
        // existe).
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('sessao', 'invalida');
        const blockedResponse = NextResponse.redirect(loginUrl);
        blockedResponse.cookies.delete('auth_token');
        blockedResponse.cookies.delete('user_role');
        blockedResponse.cookies.delete('user_info');
        return blockedResponse;
      }

      // checa acesso do papel aquela rota. se nao tiver, manda
      // pro dashboard com ?denied=1 (o appshell le isso e mostra
      // o toast de acesso negado).
      const hasAccess = hasRouteAccess(userRole, pathname);
      if (!hasAccess) {
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('denied', '1');
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

// configuracao do matcher do middleware. o regex libera tudo
// que NAO for _next/static, _next/image ou favicon.ico, evitando
// rodar a checagem em assets internos que nao precisam de auth.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};