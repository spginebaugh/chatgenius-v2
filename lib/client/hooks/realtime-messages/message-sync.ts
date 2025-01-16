"use client"

import { useEffect, useMemo } from 'react'
import type { UiMessage } from '@/types/messages-ui'
import type { MessageCallbacks } from './types'

function compareArrays<T>(a: T[] | undefined, b: T[] | undefined, compareFn: (x: T, y: T) => boolean): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((item, i) => compareFn(item, b[i]))
}

function compareMessages(a: UiMessage, b: UiMessage) {
  // Compare only essential properties that affect UI rendering
  const essentialPropsMatch = 
    a.message_id === b.message_id &&
    a.message === b.message &&
    a.user_id === b.user_id

  // Compare reactions by emoji
  const reactionsMatch = compareArrays(
    a.reactions,
    b.reactions,
    (r1, r2) => r1.emoji === r2.emoji
  )

  // Compare files by length only since file content is immutable
  const filesMatch = (!a.files && !b.files) || 
    (a.files?.length === b.files?.length)

  // Compare thread messages by length only since they're managed separately
  const threadMessagesMatch = (!a.thread_messages && !b.thread_messages) ||
    (a.thread_messages?.length === b.thread_messages?.length)

  return essentialPropsMatch && 
    reactionsMatch && 
    filesMatch && 
    threadMessagesMatch
}

export function useMessageSync({
  messages,
  realtimeMessages,
  setRealtimeMessages,
  addOrUpdateMessage,
  removeMessage,
  mountedRef,
  callbacks
}: {
  messages: UiMessage[]
  realtimeMessages: UiMessage[]
  setRealtimeMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>
  addOrUpdateMessage: (message: UiMessage) => void
  removeMessage: (messageId: number) => void
  mountedRef: React.MutableRefObject<boolean>
  callbacks: MessageCallbacks
}) {
  const syncMessages = useMemo(() => () => {
    if (!mountedRef.current) return

    // Create sets of message IDs for efficient lookup
    const currentIds = new Set(realtimeMessages.map(m => m.message_id))
    const newIds = new Set(messages.map(m => m.message_id))

    // Handle deletions
    realtimeMessages.forEach(msg => {
      if (!newIds.has(msg.message_id)) {
        removeMessage(msg.message_id)
      }
    })

    // Handle additions and updates
    messages.forEach(msg => {
      const existingMsg = realtimeMessages.find(m => m.message_id === msg.message_id)
      if (!existingMsg || !compareMessages(msg, existingMsg)) {
        addOrUpdateMessage(msg)
      }
    })
  }, [messages, realtimeMessages, addOrUpdateMessage, removeMessage, mountedRef])

  useEffect(() => {
    syncMessages()
  }, [syncMessages])
} 