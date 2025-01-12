import { describe, it, expect, beforeEach } from 'vitest'
import { useMessagesStore } from '../messages'
import { ReactionType } from '@/types/frontend'

describe('useMessagesStore', () => {
  const mockMessage = {
    id: '1',
    message: 'Test message',
    inserted_at: new Date().toISOString(),
    profiles: {
      id: 'user1',
      username: 'testuser'
    }
  }

  const mockReaction: ReactionType = {
    emoji: '👍',
    count: 1,
    reacted_by_me: true
  }

  const channelKey = 'channel1'

  beforeEach(() => {
    useMessagesStore.setState({
      messages: {},
      isLoading: false,
      error: null
    })
  })

  it('should initialize with empty state', () => {
    const state = useMessagesStore.getState()
    expect(state.messages).toEqual({})
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set messages', () => {
    const { setMessages } = useMessagesStore.getState()
    setMessages(channelKey, [mockMessage])
    expect(useMessagesStore.getState().messages[channelKey]).toEqual([mockMessage])
  })

  it('should add a new message', () => {
    const { addMessage } = useMessagesStore.getState()
    addMessage(channelKey, mockMessage)
    expect(useMessagesStore.getState().messages[channelKey]).toEqual([mockMessage])
  })

  it('should add a thread message', () => {
    const { setMessages, addThreadMessage } = useMessagesStore.getState()
    const threadMessage = { ...mockMessage, id: '2' }
    
    // Add parent message first
    setMessages(channelKey, [mockMessage])
    
    // Add thread message
    addThreadMessage(channelKey, mockMessage.id, threadMessage)
    
    const messages = useMessagesStore.getState().messages[channelKey]
    expect(messages[0].thread_messages).toEqual([threadMessage])
  })

  it('should update message reactions', () => {
    const { setMessages, updateReactions } = useMessagesStore.getState()
    setMessages(channelKey, [mockMessage])
    updateReactions(channelKey, mockMessage.id, [mockReaction], 'channel_message')
    
    const messages = useMessagesStore.getState().messages[channelKey]
    expect(messages[0].reactions).toEqual([mockReaction])
  })

  it('should delete a message', () => {
    const { setMessages, deleteMessage } = useMessagesStore.getState()
    setMessages(channelKey, [mockMessage])
    deleteMessage(channelKey, mockMessage.id)
    expect(useMessagesStore.getState().messages[channelKey]).toEqual([])
  })

  it('should handle loading state', () => {
    const { setLoading } = useMessagesStore.getState()
    setLoading(true)
    expect(useMessagesStore.getState().isLoading).toBe(true)
    setLoading(false)
    expect(useMessagesStore.getState().isLoading).toBe(false)
  })

  it('should handle error state', () => {
    const { setError } = useMessagesStore.getState()
    setError('Test error')
    expect(useMessagesStore.getState().error).toBe('Test error')
  })

  it('should reset state', () => {
    const { setMessages, setError, reset } = useMessagesStore.getState()
    
    // Change state
    setMessages(channelKey, [mockMessage])
    setError('Test error')
    
    // Reset
    reset()
    
    // Verify reset
    const state = useMessagesStore.getState()
    expect(state.messages).toEqual({})
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
}) 