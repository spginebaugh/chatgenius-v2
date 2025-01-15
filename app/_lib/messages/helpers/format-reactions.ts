interface FormatReactionsProps {
  reactions: Array<{
    emoji: string
    user_id: string
  }>
  currentUserId: string
}

/**
 * Formats reactions for a message
 */
export function formatReactions({ reactions, currentUserId }: FormatReactionsProps) {
  // Group reactions by emoji
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  reactions.forEach(reaction => {
    if (!reactionsByEmoji.has(reaction.emoji)) {
      reactionsByEmoji.set(reaction.emoji, new Set())
    }
    reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
  })

  // Format reactions for display
  return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reacted_by_me: users.has(currentUserId)
  }))
} 