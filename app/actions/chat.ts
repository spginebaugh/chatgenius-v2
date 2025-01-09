"use server"

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const messageContent = formData.get("message")?.toString();
  const channelId = formData.get("channelId")?.toString();

  if (!messageContent || !channelId) {
    throw new Error("Message and channel ID are required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase.from("messages").insert({
    message: messageContent,
    channel_id: channelId,
    user_id: user.id,
    inserted_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/channel/${channelId}`);
} 