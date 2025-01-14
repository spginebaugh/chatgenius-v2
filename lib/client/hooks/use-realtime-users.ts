"use client";

import { useCallback, useEffect, useRef } from 'react';
import { setupSubscription } from '@/lib/supabase/realtime-helpers';
import type { User } from '@/types/database';

interface UseRealtimeUsersProps {
  onUserUpdate?: (user: User) => void;
}

type Subscription = Awaited<ReturnType<typeof setupSubscription>>;

interface SubscriptionRefs {
  subscriptionRef: React.MutableRefObject<Subscription | null>;
  callbackRef: React.MutableRefObject<((user: User) => void) | undefined>;
}

function cleanupSubscription(refs: SubscriptionRefs) {
  if (refs.subscriptionRef.current) {
    console.log('Cleaning up users subscription');
    refs.subscriptionRef.current.unsubscribe();
    refs.subscriptionRef.current = null;
  }
}

function handleUserUpdate(user: User, refs: SubscriptionRefs) {
  refs.callbackRef.current?.(user);
}

async function setupUserSubscription(refs: SubscriptionRefs) {
  if (refs.subscriptionRef.current) {
    console.log('Users subscription already exists, skipping setup');
    return;
  }

  try {
    const subscription = await setupSubscription<User>({
      table: 'users',
      onPayload: ({ eventType, new: newUser }) => {
        if (eventType === 'UPDATE' && newUser) {
          handleUserUpdate(newUser, refs);
        }
      }
    });

    refs.subscriptionRef.current = subscription;
  } catch (error) {
    console.error('Error setting up users subscription:', error);
  }
}

export function useRealtimeUsers({ onUserUpdate }: UseRealtimeUsersProps = {}) {
  const subscriptionRef = useRef<Subscription | null>(null);
  const callbackRef = useRef(onUserUpdate);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = onUserUpdate;
  }, [onUserUpdate]);

  useEffect(() => {
    const refs: SubscriptionRefs = {
      subscriptionRef,
      callbackRef
    };

    setupUserSubscription(refs).catch(error => {
      console.error('Error in setupUserSubscription:', error);
    });

    return () => cleanupSubscription(refs);
  }, []); // No dependencies needed since we use refs

  return {};
} 