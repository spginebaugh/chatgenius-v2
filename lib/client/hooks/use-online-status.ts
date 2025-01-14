"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, UserStatus } from '@/types/database';

interface UseOnlineStatusProps {
  userId: string;
}

export function useOnlineStatus({ userId }: UseOnlineStatusProps) {
  const [status, setStatus] = useState<UserStatus>('OFFLINE');
  const supabase = createClient();

  useEffect(() => {
    let subscription: any;

    const setupPresence = async () => {
      // Set initial status to ONLINE
      await supabase
        .from('users')
        .update({ 
          status: 'ONLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Subscribe to presence channel
      subscription = supabase
        .channel('online-users')
        .on('presence', { event: 'sync' }, () => {
          setStatus('ONLINE');
        })
        .subscribe();

      // Handle visibility change
      const handleVisibilityChange = async () => {
        const newStatus = document.hidden ? 'OFFLINE' : 'ONLINE';
        await supabase
          .from('users')
          .update({ 
            status: newStatus,
            last_active_at: new Date().toISOString()
          })
          .eq('id', userId);
        setStatus(newStatus);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    setupPresence();

    return () => {
      subscription?.unsubscribe();
    };
  }, [userId, supabase]);

  return status;
} 