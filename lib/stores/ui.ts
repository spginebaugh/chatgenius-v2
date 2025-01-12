import { createStore } from './config'

interface UIState {
  isSidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  reset: () => void
}

const initialState = {
  isSidebarOpen: false,
  theme: 'system' as const,
}

export const useUIStore = createStore<UIState>({
  ...initialState,
  
  setTheme: (theme) => 
    useUIStore.setState({ theme }),
  
  toggleSidebar: () => 
    useUIStore.setState((state) => ({ 
      isSidebarOpen: !state.isSidebarOpen 
    })),
  
  reset: () => 
    useUIStore.setState(initialState),
}, 'ui-store') 