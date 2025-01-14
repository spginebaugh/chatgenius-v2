"use client";

import { useCallback, useEffect, useRef } from 'react';
import { setupSubscription } from '@/lib/supabase/realtime-helpers';
import type { User } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeUsersProps {
  onUserUpdate?: (user: User) => void;
}

type Subscription = Awaited<ReturnType<typeof setupSubscription>>;

export function useRealtimeUsers({ onUserUpdate }: UseRealtimeUsersProps = {}) {
  const subscriptionRef = useRef<Subscription | null>(null);
  const onUserUpdateRef = useRef(onUserUpdate);

  // Keep callback ref up to date
  useEffect(() => {
    onUserUpdateRef.current = onUserUpdate;
  }, [onUserUpdate]);

  const handleUserUpdate = useCallback((user: User) => {
    onUserUpdateRef.current?.(user);
  }, []);

  useEffect(() => {
    const setupSubscriptions = async () => {
      if (subscriptionRef.current) {
        console.log('Users subscription already exists, skipping setup');
        return;
      }

      try {
        const subscription = await setupSubscription<User>({
          table: 'users',
          onPayload: ({ eventType, new: newUser, old: oldUser }) => {
            if (eventType === 'UPDATE' && newUser) {
              handleUserUpdate(newUser);
            }
          }
        });

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('Error setting up users subscription:', error);
      }
    };

    setupSubscriptions();

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up users subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [handleUserUpdate]); // Only depends on memoized callback

  return {};
} 