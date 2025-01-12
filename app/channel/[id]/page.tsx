import { ChatServer } from "@/app/_components/chat-server"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params
  return <ChatServer viewType="channel" id={resolvedParams.id} />
} 