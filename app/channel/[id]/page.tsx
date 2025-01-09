import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sendMessage } from "@/app/actions/chat";
import Link from "next/link";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>,
}) {
  cookies();
  const supabase = await createClient();
  const { id } = await params;
  const channelId = Number(id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch channels
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .order('created_at', { ascending: true });

  // Fetch current channel
  const { data: currentChannel } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single();

  // Fetch messages for this channel
  const { data: messages, error } = await supabase
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

  if (error) {
    console.error('Error fetching messages:', error);
  }

  console.log('Messages:', messages);

  if (!currentChannel) {
    return redirect("/");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1d21] text-[#D1D2D3] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Workspace Name</h1>
          <button className="text-muted-foreground hover:text-foreground">⚙️</button>
        </div>

        {/* Channels */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Channels</h2>
          <ul className="space-y-1">
            {channels?.map((channel) => (
              <li key={channel.id}>
                <Link 
                  href={`/channel/${channel.id}`}
                  className={`flex items-center ${
                    channel.id === currentChannel.id 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  # {channel.slug}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct Messages */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Direct Messages</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/dm/1" className="text-muted-foreground hover:text-foreground flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                John Doe
              </Link>
            </li>
            <li>
              <Link href="/dm/2" className="text-muted-foreground hover:text-foreground flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Jane Smith
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#222529]">
        {/* Channel Header */}
        <div className="h-14 border-b border-[#2e3136] flex items-center px-4">
          <h2 className="font-semibold text-[#D1D2D3]">
            #{currentChannel.slug}
          </h2>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#222529]">
          {messages?.map((message) => (
            <div key={message.id} className="flex items-start gap-3 hover:bg-[#27292c] px-2 py-1 rounded">
              <div className="w-9 h-9 rounded bg-[#1a1d21] text-[#D1D2D3] flex items-center justify-center uppercase font-medium">
                {message.profiles?.username?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[#D1D2D3]">{message.profiles?.username}</span>
                  <span className="text-xs text-[#9B9C9D]">
                    {new Date(message.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#D1D2D3]">{message.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="px-4 py-3 border-t border-[#2e3136]">
          <form action={sendMessage}>
            <input type="hidden" name="channelId" value={channelId} />
            <input
              type="text"
              name="message"
              placeholder={`Message #${currentChannel.slug}`}
              className="w-full p-2 rounded bg-[#27292c] border border-[#2e3136] text-[#D1D2D3] placeholder-[#9B9C9D] focus:outline-none focus:border-[#4f545c]"
            />
          </form>
        </div>
      </div>
    </div>
  );
} 