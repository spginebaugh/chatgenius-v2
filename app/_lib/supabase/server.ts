import { createServerClient as createClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for Server Components and Server Actions
 */
export const createServerClient = async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, {
              path: '/',
              ...options,
              // Convert maxAge to expires if provided
              ...(options.maxAge && {
                expires: new Date(Date.now() + options.maxAge * 1000)
              })
            })
          } catch (error) {
            // This can happen if the cookie is set during a dynamic action or middleware
            // We can safely ignore this case
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', {
              path: '/',
              ...options,
              expires: new Date(0)
            })
          } catch (error) {
            // This can happen if the cookie is removed during a dynamic action or middleware
            // We can safely ignore this case
          }
        },
      },
    }
  )
} 