# State Management with Zustand

## Overview

Our application uses Zustand for client-side state management, with a focus on type safety, performance, and developer experience. The stores are organized by domain and follow consistent patterns for actions and error handling.

## Store Configuration

All stores are created using a type-safe store creator in `lib/stores/config.ts`:

```typescript
const store = createStore<StoreState>({
  ...initialState,
  actions: () => ({...}),
}, 'store-name', true) // Enable storage for offline support
```

### Features
- Type-safe state and actions
- DevTools integration in development
- Persistence configuration for offline support
- Hydration handling for SSR
- Reset functionality for testing

## Available Stores

### UI Store (`lib/stores/ui.ts`)
Manages application-wide UI state:
- Theme preferences
- Sidebar visibility
- Loading states
- Error handling

```typescript
const { theme, setTheme, toggleSidebar } = useUIStore()
```

### Messages Store (`lib/stores/messages.ts`)
Handles chat message state:
- Channel messages
- Direct messages
- Thread messages
- Message reactions
- Optimistic updates

```typescript
const { messages, addMessage, updateReactions } = useMessagesStore()
```

### Users Store (`lib/stores/users.ts`)
Manages user-related state:
- Online/offline status
- User profiles
- Current user
- User presence

```typescript
const { users, currentUser, updateUserStatus } = useUsersStore()
```

## Best Practices

1. **State Updates**
   - Use immutable updates
   - Prefer atomic state changes
   - Handle loading and error states consistently

2. **Type Safety**
   - Define interfaces for state and actions
   - Use discriminated unions for complex states
   - Leverage TypeScript's type inference

3. **Performance**
   - Subscribe to specific state slices
   - Use selectors for derived state
   - Implement proper cleanup in components

4. **Testing**
   - Reset store state in `beforeEach`
   - Test actions in isolation
   - Verify state transitions

## Examples

### Basic Usage
```typescript
import { useUIStore } from '@/lib/stores/ui'

function ThemeToggle() {
  const { theme, setTheme } = useUIStore()
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  )
}
```

### With Loading States
```typescript
import { useMessagesStore } from '@/lib/stores/messages'

function MessageList() {
  const { messages, isLoading, error } = useMessagesStore()
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return <Messages data={messages} />
}
```

### Optimistic Updates
```typescript
import { useMessagesStore } from '@/lib/stores/messages'

function MessageInput() {
  const { addMessage } = useMessagesStore()
  
  const sendMessage = async (text: string) => {
    const tempId = 'temp-' + Date.now()
    addMessage('channel-1', { id: tempId, text })
    
    try {
      const result = await sendMessageToServer(text)
      // Update with real message ID
    } catch (error) {
      // Handle error and revert optimistic update
    }
  }
}
``` 