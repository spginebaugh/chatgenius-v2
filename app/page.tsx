import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureDefaultChannels } from "./actions/channels";

export default async function Home() {
  cookies();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Ensure default channels exist
  await ensureDefaultChannels();

  // Fetch the general channel
  const { data: channel } = await supabase
    .from('channels')
    .select('channel_id')
    .eq('slug', 'general')
    .single();

  if (channel) {
    redirect(`/channel/${channel.channel_id}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold">Welcome to Chat</h1>
      <p className="text-muted-foreground">Error loading channels</p>
    </div>
  );
}
