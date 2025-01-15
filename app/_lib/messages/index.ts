// Server-side exports
export {
  formatBasicMessage,
  handleFileAttachments,
  sendChannelMessage,
  sendDirectMessage,
  sendThreadMessage
} from './helpers'

export {
  formatMessageForDisplay as formatMessageWithJoins,
} from './queries/format-messages'

// Types
export type {
  MessageWithJoins,
  NoThreadMessage
} from './queries/types'

// Constants
export {
  BASE_MESSAGE_QUERY,
  THREAD_MESSAGE_QUERY
} from './queries/types'

export {
  fetchThreadMessages,
  groupThreadMessagesByParent,
  formatThreadMessages
} from './queries/thread-operations'

export {
  getChannelMessages
} from './queries/channel-operations'

export {
  getDirectMessages
} from './queries/direct-operations'

export {
  getMessageReactions
} from './queries/reaction-operations'

// Re-export client-side utilities
export {
  formatMessageForClient,
  formatReactions,
  groupReactionsByEmoji
} from './client/format-messages' 