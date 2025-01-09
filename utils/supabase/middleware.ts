import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  console.log('[Middleware] Processing request for path:', request.nextUrl.pathname);
  
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    console.log('[Middleware] Initial response created');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        cookies: {
          getAll() {
            const cookies = request.cookies.getAll();
            console.log('[Middleware] Getting all cookies:', cookies.map(c => c.name));
            return cookies;
          },
          setAll(cookiesToSet) {
            console.log('[Middleware] Setting cookies:', cookiesToSet.map(c => c.name));
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    console.log('[Middleware] Supabase client created');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[Middleware] User check result:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError?.message
    });

    if ((request.nextUrl.pathname.startsWith("/protected") || 
         request.nextUrl.pathname.startsWith("/channel")) && 
        !user) {
      console.log('[Middleware] Protected route accessed without auth, redirecting to sign-in');
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    console.log('[Middleware] Request processed successfully');
    return response;
  } catch (e) {
    console.error('[Middleware] Error processing request:', e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
