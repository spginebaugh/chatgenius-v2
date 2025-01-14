import type { UiMessage } from '@/types/messages-ui'
import type { User, Channel } from '@/types/database'

// Re-export component-specific types from messages-ui.ts
export type { MessageProps } from '@/types/messages-ui'

export interface ChatViewData {
  type: 'channel' | 'dm'
  data: Channel | User
}

// Component-specific types that aren't message-related
export interface ChatLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
}

export interface ChatHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
} 