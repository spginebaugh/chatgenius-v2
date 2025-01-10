import { ChatServer } from "@/app/_components/chat-server"

interface ChannelPageProps {
  params: Promise<{ id: string }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const resolvedParams = await params
  return <ChatServer viewType="channel" id={resolvedParams.id} />
} 