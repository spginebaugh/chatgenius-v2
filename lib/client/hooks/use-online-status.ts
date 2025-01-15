"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { User, UserStatus } from '@/types/database';

interface UseOnlineStatusProps {
  userId: string;
}

interface PresenceRefs {
  subscriptionRef: React.MutableRefObject<RealtimeChannel | null>;
  cleanupListenerRef: React.MutableRefObject<(() => void) | null>;
}

// Create a single client instance to be shared
const supabaseClient = createClient();

async function updateUserStatus({
  userId,
  status,
  supabase = supabaseClient // Default to shared client
}: {
  userId: string;
  status: UserStatus;
  supabase?: ReturnType<typeof createClient>;
}) {
  try {
    await supabase
      .from('users')
      .update({ 
        status,
        last_active_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating user status:', error);
  }
}

function setupVisibilityListener({
  userId,
  supabase = supabaseClient, // Default to shared client
  setStatus
}: {
  userId: string;
  supabase?: ReturnType<typeof createClient>;
  setStatus: (status: UserStatus) => void;
}) {
  const handleVisibilityChange = async () => {
    const newStatus = document.hidden ? 'OFFLINE' : 'ONLINE';
    await updateUserStatus({ userId, status: newStatus, supabase });
    setStatus(newStatus);
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

function cleanupPresence(refs: PresenceRefs) {
  if (refs.subscriptionRef.current) {
    refs.subscriptionRef.current.unsubscribe();
    refs.subscriptionRef.current = null;
  }
  if (refs.cleanupListenerRef.current) {
    refs.cleanupListenerRef.current();
    refs.cleanupListenerRef.current = null;
  }
}

async function setupPresenceSubscription({
  userId,
  supabase = supabaseClient, // Default to shared client
  setStatus,
  refs
}: {
  userId: string;
  supabase?: ReturnType<typeof createClient>;
  setStatus: (status: UserStatus) => void;
  refs: PresenceRefs;
}) {
  try {
    // Clean up any existing subscriptions first
    cleanupPresence(refs);

    // Set initial status to ONLINE
    await updateUserStatus({ userId, status: 'ONLINE', supabase });

    // Subscribe to presence channel
    refs.subscriptionRef.current = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        setStatus('ONLINE');
      })
      .subscribe();

    // Setup visibility change listener
    refs.cleanupListenerRef.current = setupVisibilityListener({
      userId,
      supabase,
      setStatus
    });
  } catch (error) {
    console.error('Error setting up presence subscription:', error);
  }
}

export function useOnlineStatus({ userId }: UseOnlineStatusProps) {
  const [status, setStatus] = useState<UserStatus>('OFFLINE');
  
  // Create stable refs
  const refs = useMemo<PresenceRefs>(() => ({
    subscriptionRef: { current: null },
    cleanupListenerRef: { current: null }
  }), []);

  // Setup presence subscription
  useEffect(() => {
    if (!userId) return;

    setupPresenceSubscription({
      userId,
      setStatus,
      refs
    }).catch(error => {
      console.error('Error in setupPresenceSubscription:', error);
    });

    return () => cleanupPresence(refs);
  }, [userId, refs]); // Only depend on userId and stable refs

  return status;
} 