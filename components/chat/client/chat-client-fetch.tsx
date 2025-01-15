"use client"

import type { ChatClientFetchProps } from './types'
import { useMessageFetch } from './hooks/use-message-fetch'

export function ChatClientFetch(props: ChatClientFetchProps) {
  useMessageFetch(props)
  return null
} 