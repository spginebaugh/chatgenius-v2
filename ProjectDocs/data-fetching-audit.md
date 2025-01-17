# Data Fetching Audit

## Current Data Fetching Patterns

### Server-Side Data Fetching

1. **Chat Server Component** (`app/_components/chat-server.tsx`)
   - Fetches initial data for channels, users, messages, and reactions
   - Uses parallel queries for performance
   - Handles complex data relationships
   - Appropriate for SSR as it's initial page data

2. **Protected Routes** (`app/protected/page.tsx`)
   - Fetches user authentication data
   - Used for route protection
   - Appropriate for SSR as it's auth verification

3. **Channel Management** (`app/actions/channels.ts`)
   - Server actions for channel operations
   - Handles default channel creation
   - Appropriate as server action for data mutations

### Client-Side Data Fetching

1. **Message Fetching** (`hooks/use-message-fetch.ts`)
   - Handles fetching messages for channels, threads, and DMs
   - Manages loading and error states
   - Refreshes data on relevant prop changes

2. **User Status** (`hooks/use-online-status.ts`)
   - Updates user online status
   - Requires browser APIs (visibility, beforeunload)
   - Must be client-side due to browser API dependencies

### Hybrid Patterns

1. **Chat Implementation** (`components/chat/chat-client.tsx`)
   - Initial data from server (SSR)
   - Client-side updates through polling
   - State management for messages and reactions
   - Good candidate for Zustand store integration

## Categorization

### Must Be Client-Side
- User online status tracking
- Browser API dependent features
- Interactive UI state
- Message polling and updates

### Can Be Server-Side
- Initial data loading
- Authentication checks
- Route protection
- Static content

### Hybrid (SSR + Client Updates)
- Chat messages (initial load + polling)
- User list (initial load + status updates)
- Channel list (initial load + updates)

## Optimization Opportunities

1. **State Management**
   - Centralize message state in Zustand store
   - Centralize user status management
   - Create dedicated stores for channels and messages

2. **Data Fetching**
   - Implement request deduplication
   - Add caching layer for frequently accessed data
   - Use optimistic updates for better UX
   - Implement efficient polling strategies

3. **Performance**
   - Implement proper error boundaries
   - Add loading states
   - Use suspense boundaries for data loading
   - Optimize polling intervals

## Technical Debt

1. **Inconsistent Patterns**
   - Mix of direct Supabase calls and custom hooks
   - Duplicate data fetching logic
   - Inconsistent error handling

2. **Missing Features**
   - No proper caching strategy
   - Limited offline support
   - Incomplete error boundaries

## Next Steps

1. Create Zustand stores for:
   - Messages and threads
   - User status and presence
   - Channel state
   - UI state (modals, sidebars, etc.)

2. Implement proper data fetching utilities:
   - Centralized query functions
   - Error handling utilities
   - Loading state management
   - Efficient polling mechanisms

3. Add proper error boundaries and suspense boundaries for better UX 