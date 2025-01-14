"use client";

import { useEffect, useRef, useState } from 'react';
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

async function updateUserStatus({
  userId,
  status,
  supabase
}: {
  userId: string;
  status: UserStatus;
  supabase: ReturnType<typeof createClient>;
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
  supabase,
  setStatus
}: {
  userId: string;
  supabase: ReturnType<typeof createClient>;
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
  refs.subscriptionRef.current?.unsubscribe();
  refs.subscriptionRef.current = null;
  refs.cleanupListenerRef.current?.();
  refs.cleanupListenerRef.current = null;
}

async function setupPresenceSubscription({
  userId,
  supabase,
  setStatus,
  refs
}: {
  userId: string;
  supabase: ReturnType<typeof createClient>;
  setStatus: (status: UserStatus) => void;
  refs: PresenceRefs;
}) {
  try {
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
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const cleanupListenerRef = useRef<(() => void) | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const refs: PresenceRefs = {
      subscriptionRef,
      cleanupListenerRef
    };

    setupPresenceSubscription({
      userId,
      supabase,
      setStatus,
      refs
    }).catch(error => {
      console.error('Error in setupPresenceSubscription:', error);
    });

    return () => cleanupPresence(refs);
  }, [userId, supabase]);

  return status;
} 