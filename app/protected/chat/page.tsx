import { getChannels, getUsers, getCurrentUser, getChannelMessages } from '@/app/_lib'
import { ChatClient } from '@/components/chat/chat-client'
import { redirect } from 'next/navigation'

export default async function Page() {
  const [channels, users, currentUser] = await Promise.all([
    getChannels(),
    getUsers(),
    getCurrentUser()
  ])

  // Redirect to sign in if no user
  if (!currentUser) {
    redirect('/sign-in')
  }

  // Redirect to setup if no channels exist
  if (!channels?.length) {
    redirect('/setup')
  }

  // Default to first channel view
  const defaultView = {
    type: "channel" as const,
    data: channels[0]
  }

  // Fetch initial messages for the default channel
  const initialMessages = await getChannelMessages(channels[0].id)

  return (
    <ChatClient
      channels={channels}
      users={users}
      currentUser={currentUser}
      initialView={defaultView}
      initialMessages={initialMessages}
    />
  )
} 