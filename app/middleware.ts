import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function middleware(request: NextRequest) {
  // Skip static files and Next.js internals
  if (request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // In development, proxy API requests to Vite
  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/api')) {
    const viteUrl = new URL(request.nextUrl.pathname, 'http://localhost:5173');
    try {
      const response = await fetch(viteUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      return new NextResponse(response.body, {
        status: response.status,
        headers: response.headers
      });
    } catch (error) {
      console.error('Error proxying to Vite server:', error);
      return NextResponse.next();
    }
  }

  // For non-API routes in development or all routes in production
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
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}; 