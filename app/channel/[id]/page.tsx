import { ChannelClient } from './client'
import { fetchChannelData } from "./server"
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Message, Profile } from '@/types/database'

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  console.log('[ChannelPage] Starting page load');
  const supabase = await createClient();
  console.log('[ChannelPage] Supabase client created');

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('[ChannelPage] User check result:', {
    hasUser: !!user,
    userError: userError?.message,
    userId: user?.id
  });

  if (!user) {
    console.log('[ChannelPage] No user found, redirecting to sign-in');
    redirect('/sign-in');
  }

  const resolvedParams = await params;
  console.log('[ChannelPage] Resolved params:', resolvedParams);

  if (!resolvedParams?.id) {
    console.log('[ChannelPage] No channel ID found, redirecting to home');
    redirect('/');
  }

  try {
    console.log('[ChannelPage] Fetching channel data for ID:', resolvedParams.id);
    const channelData = await fetchChannelData({ id: resolvedParams.id });
    console.log('[ChannelPage] Channel data fetched:', {
      hasCurrentChannel: !!channelData.currentChannel,
      channelCount: channelData.channels?.length
    });

    if (!channelData.currentChannel?.id) {
      console.log('[ChannelPage] No current channel found, redirecting to home');
      redirect('/');
    }

    console.log('[ChannelPage] Rendering ChannelClient component');
    return <ChannelClient 
      channels={channelData.channels || []}
      currentChannel={channelData.currentChannel}
      messages={channelData.messages}
      users={channelData.users || []}
    />;
  } catch (error) {
    console.error('[ChannelPage] Error loading channel:', error);
    redirect('/');
  }
} 