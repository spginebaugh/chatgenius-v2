# Task Objective
Remove all code related to realtime messaging functionality while preserving core messaging features and dependencies.

# Current State Assessment
The codebase currently includes realtime messaging capabilities using Supabase's realtime features, with code spread across multiple components and hooks.

# Future State Goal
A simplified messaging system without realtime updates, where messages are fetched on-demand or through polling if needed.

# Implementation Plan

1. Remove Realtime Hooks and Components
   - [ ] Remove realtime subscription code from message hooks
   - [ ] Clean up channel-related realtime code
   - [ ] Remove realtime-specific providers
   - [ ] Clean up any realtime event handlers

2. Clean Up Message Store
   - [ ] Remove realtime subscription logic from message stores
   - [ ] Clean up realtime-specific types and utilities
   - [ ] Update message fetching logic to be pull-based

3. Verify Core Functionality
   - [ ] Ensure basic message fetching still works
   - [ ] Verify message sending functionality remains intact
   - [ ] Test channel message loading
   - [ ] Confirm no realtime code remains

# Files to Modify

1. Message Hooks:
   - `components/chat/hooks/use-chat-messages.ts`
   - `components/chat/hooks/use-channel-messages.ts`
   - `components/chat/client/hooks/use-message-fetch.ts`

2. Message Store:
   - `lib/stores/messages/index.ts`
   - `lib/stores/messages/types.ts`
   - `lib/stores/messages/utils.ts`

3. Providers:
   - `components/chat/providers/messages-provider.tsx`
   - `components/chat/providers/chat-provider.tsx` 