import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'system',
      isSidebarOpen: false
    })
  })

  it('should initialize with default state', () => {
    const state = useUIStore.getState()
    expect(state.theme).toBe('system')
    expect(state.isSidebarOpen).toBe(false)
  })

  it('should update theme', () => {
    const { setTheme } = useUIStore.getState()
    setTheme('dark')
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('should toggle sidebar', () => {
    const { toggleSidebar } = useUIStore.getState()
    toggleSidebar()
    expect(useUIStore.getState().isSidebarOpen).toBe(true)
    toggleSidebar()
    expect(useUIStore.getState().isSidebarOpen).toBe(false)
  })

  it('should reset state', () => {
    const { setTheme, toggleSidebar, reset } = useUIStore.getState()
    
    // Change some values
    setTheme('dark')
    toggleSidebar()
    
    // Reset
    reset()
    
    // Verify reset
    const state = useUIStore.getState()
    expect(state.theme).toBe('system')
    expect(state.isSidebarOpen).toBe(false)
  })
}) 