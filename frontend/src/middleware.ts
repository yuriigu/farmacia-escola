import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/navigation';
import { hasRouteAccess } from './config/rbac';

// Public routes that do not require authentication
const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: any) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, next internal files, and api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get('auth_token')?.value;
  const roleCookie = request.cookies.get('user_role')?.value;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // 1. Unauthenticated user trying to access protected route -> redirect to /login
  if (!tokenCookie && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user trying to access /login or /register -> redirect to /dashboard
  if (tokenCookie && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Authenticated user accessing a protected route -> check role permissions
  if (tokenCookie && !isPublicPath && pathname !== '/') {
    const userRole = roleCookie ? decodeURIComponent(roleCookie) : null;

    // If role is present and user does not have permission for the requested route
    if (userRole && !hasRouteAccess(userRole, pathname)) {
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('denied', '1');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
