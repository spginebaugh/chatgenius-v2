'use server'

import { handleMessage as _handleMessage } from './handle-message'
import { addEmojiReaction as _addEmojiReaction } from './handle-reaction'
export type * from './types'

export async function handleMessage(params: Parameters<typeof _handleMessage>[0]) {
  return _handleMessage(params)
}

export async function addEmojiReaction(params: Parameters<typeof _addEmojiReaction>[0]) {
  return _addEmojiReaction(params)
} 