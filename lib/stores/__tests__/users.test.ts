import { describe, it, expect, beforeEach } from 'vitest'
import { useUsersStore } from '../users'
import { User } from '@/types/database'

describe('useUsersStore', () => {
  const mockUser: User = {
    id: 'user1',
    username: 'testuser',
    bio: 'Test bio',
    profile_picture_url: 'https://example.com/avatar.jpg',
    last_active_at: new Date().toISOString(),
    status: 'ONLINE',
    inserted_at: new Date().toISOString()
  }

  beforeEach(() => {
    useUsersStore.setState({
      users: {},
      currentUser: null,
      onlineUsers: new Set(),
      isLoading: false,
      error: null
    })
  })

  it('should initialize with empty state', () => {
    const state = useUsersStore.getState()
    expect(state.users).toEqual({})
    expect(state.currentUser).toBeNull()
    expect(state.onlineUsers.size).toBe(0)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set users', () => {
    const { setUsers } = useUsersStore.getState()
    setUsers([mockUser])
    expect(useUsersStore.getState().users[mockUser.id]).toEqual(mockUser)
  })

  it('should set current user', () => {
    const { setCurrentUser } = useUsersStore.getState()
    setCurrentUser(mockUser)
    expect(useUsersStore.getState().currentUser).toEqual(mockUser)
  })

  it('should update user status', () => {
    const { setUsers, updateUserStatus } = useUsersStore.getState()
    setUsers([mockUser])
    updateUserStatus(mockUser.id, 'OFFLINE')
    expect(useUsersStore.getState().users[mockUser.id].status).toBe('OFFLINE')
  })

  it('should update user profile', () => {
    const { setUsers, updateUserProfile } = useUsersStore.getState()
    setUsers([mockUser])
    const updates = { bio: 'Updated bio' }
    updateUserProfile(mockUser.id, updates)
    expect(useUsersStore.getState().users[mockUser.id].bio).toBe('Updated bio')
  })

  it('should handle loading state', () => {
    const { setLoading } = useUsersStore.getState()
    setLoading(true)
    expect(useUsersStore.getState().isLoading).toBe(true)
    setLoading(false)
    expect(useUsersStore.getState().isLoading).toBe(false)
  })

  it('should handle error state', () => {
    const { setError } = useUsersStore.getState()
    setError('Test error')
    expect(useUsersStore.getState().error).toBe('Test error')
  })

  it('should reset state', () => {
    const { setUsers, setCurrentUser, setError, reset } = useUsersStore.getState()
    
    // Change state
    setUsers([mockUser])
    setCurrentUser(mockUser)
    setError('Test error')
    
    // Reset
    reset()
    
    // Verify reset
    const state = useUsersStore.getState()
    expect(state.users).toEqual({})
    expect(state.currentUser).toBeNull()
    expect(state.onlineUsers.size).toBe(0)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
}) 