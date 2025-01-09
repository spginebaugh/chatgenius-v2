"use server"

import { createClient } from "@/utils/supabase/server";

const DEFAULT_CHANNELS = ['general', 'random', 'announcements'];

export async function ensureDefaultChannels() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check existing channels
  const { data: existingChannels } = await supabase
    .from('channels')
    .select('slug')
    .in('slug', DEFAULT_CHANNELS);

  const existingSlugs = existingChannels?.map(c => c.slug) || [];
  const missingChannels = DEFAULT_CHANNELS.filter(name => !existingSlugs.includes(name));

  // Create any missing channels
  if (missingChannels.length > 0) {
    const channelsToCreate = missingChannels.map(slug => ({
      slug,
      created_by: user.id,
    }));

    const { error } = await supabase
      .from('channels')
      .insert(channelsToCreate);

    if (error) {
      console.error('Error creating default channels:', error);
    }
  }
} 