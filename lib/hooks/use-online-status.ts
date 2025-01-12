"use client";

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUsersStore } from '@/lib/stores/users';

export function useOnlineStatus() {
  const { updateUserStatus } = useUsersStore()

  useEffect(() => {
    const supabase = createClient();
    let isUnmounting = false;

    // Function to update status
    const updateStatus = async (status: 'ONLINE' | 'OFFLINE') => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !isUnmounting) {
        // Update database
        await supabase
          .from('users')
          .update({ 
            status,
            last_active_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // Update local state
        updateUserStatus(user.id, status)
      }
    };

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateStatus('OFFLINE');
      } else if (document.visibilityState === 'visible') {
        updateStatus('ONLINE');
      }
    };

    // Handle before unload (browser/tab close)
    const handleBeforeUnload = () => {
      updateStatus('OFFLINE');
    };

    // Set initial status to online
    updateStatus('ONLINE');

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      isUnmounting = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Only set offline if it's a real unmount (not a refresh)
      if (!document.hidden) {
        updateStatus('OFFLINE');
      }
    };
  }, [updateUserStatus]);
} 