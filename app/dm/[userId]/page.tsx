import { DirectMessageClient } from './client'
import { fetchDirectMessageData } from "./server"
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const resolvedParams = await params

  if (!resolvedParams?.userId) {
    redirect('/')
  }

  try {
    const dmData = await fetchDirectMessageData({ userId: resolvedParams.userId })
    
    if (!dmData.otherUser?.id) {
      redirect('/')
    }

    return <DirectMessageClient 
      channels={dmData.channels || []}
      otherUser={dmData.otherUser}
      messages={dmData.messages}
      users={dmData.users || []}
      currentUser={user}
    />
  } catch (error) {
    console.error('[DirectMessagePage] Error loading DM:', error)
    redirect('/')
  }
} 