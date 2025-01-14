import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function middleware(request: NextRequest) {
  // Skip API routes and static files
  if (request.nextUrl.pathname.startsWith('/api') || 
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      // Check database initialization status
      const response = await fetch(`${request.nextUrl.origin}/api/database/status`);
      if (response.ok) {
        return NextResponse.next();
      }

      // Initialize database if needed
      const initResponse = await fetch(`${request.nextUrl.origin}/api/database/init`);
      if (initResponse.ok) {
        return NextResponse.next();
      }

      // If initialization failed, wait before retrying
      retries++;
      if (retries < MAX_RETRIES) {
        await wait(RETRY_DELAY);
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      retries++;
      if (retries < MAX_RETRIES) {
        await wait(RETRY_DELAY);
      }
    }
  }

  // After all retries failed, redirect to error page
  console.error('Database initialization failed after retries');
  return NextResponse.redirect(new URL('/error', request.url));
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}; 