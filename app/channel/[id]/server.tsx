import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function fetchChannelData(params: { id: string }) {
  const supabase = await createClient();
  const channelId = Number(params.id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get all users
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('username', { ascending: true });

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .order('inserted_at', { ascending: true });

  const { data: currentChannel } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single();

  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id,
      message,
      inserted_at,
      user_id,
      channel_id,
      profiles:user_id (
        username
      )
    `)
    .eq('channel_id', channelId)
    .order('inserted_at', { ascending: true });

  console.log('[fetchChannelData] Users fetched:', users);

  return { channels, currentChannel, messages, users: users || [] };
} 