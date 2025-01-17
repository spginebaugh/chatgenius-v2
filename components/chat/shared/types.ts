import type { User, Channel } from "@/types/database"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"

// View Types
export interface ChatViewData {
  type: 'channel' | 'dm'
  data: Channel | User
}

// Shared component props interfaces
export interface ChatLayoutProps {
  currentUser: User
  users: User[]
  channels: Channel[]
  messages: UiMessage[]
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => Promise<void>
  onEmojiSelect: (messageId: number, emoji: string) => Promise<void>
  initialView: ChatViewData
  isLoading?: boolean
}

export interface ThreadPanelProps {
  selectedMessage: UiMessage
  currentUserId: string
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => Promise<void>
  onClose: () => void
  onEmojiSelect: (messageId: number, emoji: string) => Promise<void>
}

export interface SidebarProps {
  channels: Channel[]
  storeUsers: User[]
  currentView: ChatViewData
}

export interface ProfileSettingsPanelProps {
  currentUsername: string | null
  onClose: () => void
}

// Shared sub-component props
export interface MessageInputProps {
  placeholder: string
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => Promise<void>
  isLoading?: boolean
}

export interface UserAvatarProps {
  username?: string | null
  status?: User['status']
  size?: 'sm' | 'md' | 'lg'
}

export interface MessageTimeProps {
  timestamp: string
} 