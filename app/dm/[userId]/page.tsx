import { ChatServer } from "@/app/_components/chat-server"

interface DMPageProps {
  params: Promise<{ userId: string }>
}

export default async function DMPage({ params }: DMPageProps) {
  const resolvedParams = await params
  return <ChatServer viewType="dm" id={resolvedParams.userId} />
} 