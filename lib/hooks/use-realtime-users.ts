"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@/types/database';

export function useRealtimeUsers(initialUsers: User[]) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });

    // Update local state when initial users prop changes
    setUsers(initialUsers);

    // Subscribe to user status changes
    const channel = supabase
      .channel('users_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          setUsers(currentUsers => 
            currentUsers.map(user => {
              // If this is the current user, always show as online
              if (user.id === currentUserId) {
                return { ...user, status: 'ONLINE' };
              }
              // For other users, update with the payload
              return user.id === payload.new.id 
                ? { ...user, ...payload.new }
                : user;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialUsers]);

  // Always show current user as online in the returned list
  return users.map(user => 
    user.id === currentUserId 
      ? { ...user, status: 'ONLINE' }
      : user
  );
} 