# Data Fetching Patterns

## Overview

Our application uses a hybrid approach to data fetching, leveraging both Server Components for initial data loading and client-side fetching for real-time updates. This documentation outlines our data fetching patterns and best practices.

## Server-Side Data Fetching

### Server Components (`lib/queries.ts`)

We use Server Components as the primary method for initial data loading:

```typescript
// In a Server Component
import { getChannelMessages } from '@/lib/queries'

async function ChannelView({ channelId }: { channelId: string }) {
  const messages = await getChannelMessages(channelId)
  return <MessageList initialData={messages} />
}
```

Available queries:
- `getChannels()`: Fetch all channels
- `getUsers()`: Fetch all users
- `getCurrentUser()`: Get authenticated user
- `getChannelMessages(channelId)`: Get messages for a channel
- `getDirectMessages(userId, otherUserId)`: Get direct messages
- `getThreadMessages(parentId, parentType)`: Get thread messages
- `getReactions(messageId, messageType)`: Get message reactions

### Error Handling

Server-side queries use structured error handling:

```typescript
try {
  const data = await getChannelMessages(channelId)
  return <MessageList data={data} />
} catch (error) {
  if (error instanceof FetchError) {
    return <ErrorBoundary error={error} />
  }
  throw error
}
```

## Client-Side Data Fetching

### Real-time Updates

We use Supabase subscriptions for real-time data:

```typescript
import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useMessagesStore } from '@/lib/stores/messages'

function useRealtimeMessages(channelId: string) {
  const { addMessage, deleteMessage } = useMessagesStore()
  
  useEffect(() => {
    const supabase = createClient()
    
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on('INSERT', (payload) => addMessage(channelId, payload.new))
      .on('DELETE', (payload) => deleteMessage(channelId, payload.old.id))
      .subscribe()
      
    return () => {
      subscription.unsubscribe()
    }
  }, [channelId])
}
```

### Optimistic Updates

For better UX, we implement optimistic updates:

1. Update local state immediately
2. Send request to server
3. Handle success/failure cases

```typescript
const sendMessage = async (text: string) => {
  // 1. Optimistic update
  const tempId = 'temp-' + Date.now()
  addMessage(channelId, { id: tempId, text })
  
  try {
    // 2. Server request
    const result = await createMessage({ channelId, text })
    // 3. Success: Update with real data
    updateMessage(channelId, tempId, result)
  } catch (error) {
    // 3. Failure: Revert optimistic update
    deleteMessage(channelId, tempId)
    setError(error.message)
  }
}
```

## State Integration

### Store Updates

Data fetching integrates with Zustand stores:

```typescript
const { data, error } = await getChannelMessages(channelId)
if (error) {
  useMessagesStore.setState({ error })
} else {
  useMessagesStore.setState({ 
    messages: {
      ...messages,
      [channelId]: data
    }
  })
}
```

### Hydration

Handle hydration of server data:

```typescript
// Server Component
const messages = await getChannelMessages(channelId)

// Client Component
useEffect(() => {
  if (messages) {
    useMessagesStore.setState({
      messages: {
        [channelId]: messages
      }
    })
  }
}, [messages])
```

## Best Practices

1. **Data Loading**
   - Use Server Components for initial data
   - Implement loading states
   - Handle errors gracefully
   - Show fallback UI during loading

2. **Real-time Updates**
   - Clean up subscriptions
   - Handle reconnection
   - Implement optimistic updates
   - Merge server/client state

3. **Error Handling**
   - Use structured error types
   - Provide user feedback
   - Implement retry logic
   - Log errors appropriately

4. **Performance**
   - Implement request deduplication
   - Cache responses where appropriate
   - Use proper loading indicators
   - Handle race conditions 