import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = await cookieStore.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: any) {
          await cookieStore.set(name, value);
        },
        async remove(name: string, options: any) {
          await cookieStore.delete(name);
        },
      },
    }
  );
};
