# Migration Guide

## Overview

This guide helps you migrate existing components to use our new data fetching and state management patterns. Follow these steps to ensure a smooth transition.

## Step 1: Identify Component Type

First, determine if your component should be a Server or Client Component:

### Server Component Candidates
- Initial page data loading
- Static content rendering
- SEO-critical content
- Non-interactive UI

### Client Component Candidates
- Interactive features
- Real-time updates
- Form handling
- Complex UI state

## Step 2: Convert to Server Component

If your component primarily loads data, convert it to a Server Component:

### Before
```typescript
// Old component with useEffect
function ChannelList() {
  const [channels, setChannels] = useState([])
  
  useEffect(() => {
    const fetchChannels = async () => {
      const response = await fetch('/api/channels')
      const data = await response.json()
      setChannels(data)
    }
    fetchChannels()
  }, [])
  
  return <div>{channels.map(...)}</div>
}
```

### After
```typescript
// New Server Component
import { getChannels } from '@/app/_lib'

async function ChannelList() {
  const channels = await getChannels()
  return <ChannelListContent initialData={channels} />
}

// Client Component for interactivity
'use client'
function ChannelListContent({ initialData }) {
  const { channels } = useChannelsStore()
  
  useEffect(() => {
    if (initialData) {
      useChannelsStore.setState({ channels: initialData })
    }
  }, [initialData])
  
  return <div>{channels.map(...)}</div>
}
```

## Step 3: Implement State Management

Replace local state with Zustand stores:

### Before
```typescript
function MessageComposer() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  const sendMessage = async () => {
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ message })
      })
      setMessage('')
    } catch (error) {
      console.error(error)
    }
    setSending(false)
  }
  
  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button disabled={sending} onClick={sendMessage}>Send</button>
    </div>
  )
}
```

### After
```typescript
function MessageComposer() {
  const [message, setMessage] = useState('')
  const { addMessage, isLoading } = useMessagesStore()
  
  const sendMessage = async () => {
    const channelId = 'current-channel'
    const tempId = 'temp-' + Date.now()
    
    // Optimistic update
    addMessage(channelId, {
      id: tempId,
      message,
      inserted_at: new Date().toISOString()
    })
    
    setMessage('')
    
    try {
      const result = await createMessage({ channelId, message })
      // Real message will be handled by subscription
    } catch (error) {
      useMessagesStore.setState({ error: error.message })
    }
  }
  
  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button disabled={isLoading} onClick={sendMessage}>Send</button>
    </div>
  )
}
```

## Step 4: Add Real-time Updates

Implement Supabase subscriptions for real-time features:

### Before
```typescript
function Messages() {
  const [messages, setMessages] = useState([])
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch('/api/messages')
      const data = await response.json()
      setMessages(data)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  return <div>{messages.map(...)}</div>
}
```

### After
```typescript
function Messages() {
  const { messages } = useMessagesStore()
  const channelId = 'current-channel'
  
  // Setup real-time subscription
  useEffect(() => {
    const supabase = createClient()
    
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on('INSERT', (payload) => {
        useMessagesStore.getState().addMessage(channelId, payload.new)
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [channelId])
  
  return <div>{messages[channelId]?.map(...)}</div>
}
```

## Step 5: Error Handling

Implement proper error handling:

### Before
```typescript
try {
  await fetch('/api/messages')
} catch (error) {
  console.error(error)
}
```

### After
```typescript
try {
  await createMessage(data)
} catch (error) {
  if (error instanceof FetchError) {
    useMessagesStore.setState({ error: error.message })
    // Show user-friendly error
  } else {
    // Log unexpected errors
    console.error(error)
    throw error
  }
}
```

## Breaking Changes

1. **API Routes**
   - Removed in favor of Server Components
   - Use `lib/queries.ts` for data fetching
   - Use `lib/mutations.ts` for data updates

2. **State Management**
   - Local state should be minimal
   - Use Zustand stores for shared state
   - Follow store patterns for consistency

3. **Real-time Updates**
   - Polling replaced with Supabase subscriptions
   - Implement proper cleanup
   - Handle connection issues

4. **Error Handling**
   - Use structured error types
   - Implement proper error boundaries
   - Show user-friendly messages 