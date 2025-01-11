"use server"

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface SendMessageParams {
  channelId: string
  message: string
}

interface SendDirectMessageParams {
  receiverId: string
  message: string
}

interface SendThreadMessageParams {
  parentId: number
  parentType: 'channel_message' | 'direct_message'
  message: string
}

interface AddEmojiReactionParams {
  parentId: string | number
  parentType: 'channel_message' | 'direct_message' | 'thread_message'
  emoji: string
}

export async function sendMessage({ channelId, message }: SendMessageParams) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("channel_messages").insert({
    channel_id: channelId,
    message,
    user_id: user.id
  });

  revalidatePath(`/channel/${channelId}`);
}

export async function sendDirectMessage({ receiverId, message }: SendDirectMessageParams) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("direct_messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    message
  });

  revalidatePath(`/dm/${receiverId}`);
}

export async function sendThreadMessage({ parentId, parentType, message }: SendThreadMessageParams) {
  console.log('[sendThreadMessage] Starting with:', { parentId, parentType, message });
  
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[sendThreadMessage] Not authenticated');
    return { error: "Not authenticated" };
  }

  // Get user profile data first
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    console.error('[sendThreadMessage] User profile not found');
    return { error: "User profile not found" };
  }

  const { data: threadMessage, error: insertError } = await supabase
    .from("thread_messages")
    .insert({
      parent_id: parentId,
      parent_type: parentType,
      message,
      user_id: user.id
    })
    .select()
    .single();

  if (insertError) {
    console.error('[sendThreadMessage] Insert error:', insertError);
    return { error: insertError.message };
  }

  console.log('[sendThreadMessage] Successfully inserted thread message:', threadMessage);

  // Get the path to revalidate based on parent type
  if (parentType === 'channel_message') {
    const { data: parentMessage, error: parentError } = await supabase
      .from('channel_messages')
      .select('channel_id')
      .eq('message_id', parentId)
      .single();
    
    if (parentError) {
      console.error('[sendThreadMessage] Error fetching parent message:', parentError);
    }
    
    if (parentMessage) {
      console.log('[sendThreadMessage] Revalidating channel path:', parentMessage.channel_id);
      revalidatePath(`/channel/${parentMessage.channel_id}`);
    }
  } else {
    const { data: parentDM, error: parentError } = await supabase
      .from('direct_messages')
      .select('receiver_id')
      .eq('message_id', parentId)
      .single();
    
    if (parentError) {
      console.error('[sendThreadMessage] Error fetching parent DM:', parentError);
    }
    
    if (parentDM) {
      console.log('[sendThreadMessage] Revalidating DM path:', parentDM.receiver_id);
      revalidatePath(`/dm/${parentDM.receiver_id}`);
    }
  }

  return { 
    data: {
      message_id: threadMessage.message_id,
      message: threadMessage.message,
      inserted_at: threadMessage.inserted_at,
      profiles: userProfile
    }
  };
}

export async function addEmojiReaction({ parentId, parentType, emoji }: AddEmojiReactionParams) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const numericParentId = typeof parentId === 'string' ? parseInt(parentId) : parentId;

  // Check if reaction already exists
  const { data: existingReaction } = await supabase
    .from("emoji_reactions")
    .select()
    .eq('user_id', user.id)
    .eq('parent_id', numericParentId)
    .eq('parent_type', parentType)
    .eq('emoji', emoji)
    .single();

  if (existingReaction) {
    // Remove the reaction if it already exists
    await supabase
      .from("emoji_reactions")
      .delete()
      .eq('reaction_id', existingReaction.reaction_id);
  } else {
    // Add new reaction
    await supabase.from("emoji_reactions").insert({
      user_id: user.id,
      parent_id: numericParentId,
      parent_type: parentType,
      emoji
    });
  }

  // Revalidate the appropriate path
  if (parentType === 'channel_message') {
    const { data: message } = await supabase
      .from('channel_messages')
      .select('channel_id')
      .eq('message_id', numericParentId)
      .single();
    
    if (message) {
      revalidatePath(`/channel/${message.channel_id}`);
    }
  } else if (parentType === 'direct_message') {
    const { data: dm } = await supabase
      .from('direct_messages')
      .select('receiver_id')
      .eq('message_id', numericParentId)
      .single();
    
    if (dm) {
      revalidatePath(`/dm/${dm.receiver_id}`);
    }
  }

  return { success: true };
} 