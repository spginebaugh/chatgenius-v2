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

export async function sendMessage({ channelId, message }: SendMessageParams) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("messages").insert({
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