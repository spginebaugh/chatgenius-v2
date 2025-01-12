import { createClient } from "@/utils/supabase/server";
import { insertRecord, selectRecords } from '@/lib/utils/supabase-helpers';
import { NextResponse } from "next/server";
import type { User } from '@/types/database';

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('Auth callback - User:', user?.id);
    if (authError) console.error('Auth error:', authError);
    
    if (user) {
      try {
        // Try to get existing user
        await selectRecords<User>({
          table: 'users',
          match: { id: user.id }
        });
      } catch (error) {
        // If user doesn't exist (404 error), create them
        if (error instanceof Error && error.message.includes('Not found')) {
          const newUser = {
            id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
          };
          console.log('Creating user:', newUser);
          
          await insertRecord<User>({
            table: 'users',
            data: newUser
          });
          
          console.log('User created successfully');
        } else {
          console.error('Error checking user:', error);
        }
      }
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Get the first available channel or default to channel 1
  const supabase = await createClient();
  const { data: channels } = await supabase.from('channels').select('channel_id').limit(1);
  const channelId = channels?.[0]?.channel_id || '1';

  // Redirect to the first channel after authentication
  return NextResponse.redirect(`${origin}/channel/${channelId}`);
}
