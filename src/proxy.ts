import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value;
  const isLoginPage = request.nextUrl.pathname === '/';

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/home', '/buku-kas', '/cek-rekening', '/kategori', '/laba-rugi', '/neraca', '/arus-kas', '/laporan', '/pengaturan'],
};
