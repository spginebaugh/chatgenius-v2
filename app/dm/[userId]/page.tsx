import { ChatServer } from "@/app/_components/chat-server"

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params
  return <ChatServer viewType="dm" id={resolvedParams.userId} />
} 