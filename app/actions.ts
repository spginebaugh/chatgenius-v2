"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { updateRecord } from '@/lib/utils/supabase-helpers';
import type { User } from '@/types/database';

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  console.log('[SignInAction] Starting sign-in process');
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  console.log('[SignInAction] Email:', email);

  const supabase = await createClient();
  console.log('[SignInAction] Supabase client created');

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[SignInAction] Error during sign-in:', error.message);
    return encodedRedirect("error", "/sign-in", error.message);
  }

  console.log('[SignInAction] Sign-in successful, user:', data.user?.id);
  console.log('[SignInAction] Session created:', !!data.session);

  // Update user status to ONLINE
  await updateRecord<User>({
    table: 'users',
    data: { 
      status: 'ONLINE',
      last_active_at: new Date().toISOString()
    },
    match: { id: data.user.id },
    options: {
      errorMap: {
        'not_found': {
          message: 'User profile not found',
          status: 404
        }
      }
    }
  });

  // Get the first channel or default to channel 1
  const { data: channels, error: channelError } = await supabase
    .from('channels')
    .select('channel_id')
    .limit(1);
  
  if (channelError) {
    console.error('[SignInAction] Error fetching channels:', channelError.message);
    return encodedRedirect("error", "/sign-in", "Error fetching channels");
  }

  const channelId = channels?.[0]?.channel_id || '1';
  return redirect(`/channel/${channelId}`);
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Update user status to OFFLINE
      await updateRecord<User>({
        table: 'users',
        data: { 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        },
        match: { id: user.id }
      });

      // Wait a moment for the status update to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await supabase.auth.signOut();
    return redirect("/sign-in");
  } catch (error) {
    console.error('[SignOutAction] Error during sign out:', error);
    return redirect("/sign-in");
  }
};

export async function logout() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Update user status to OFFLINE
      await updateRecord<User>({
        table: 'users',
        data: { 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        },
        match: { id: user.id }
      });

      // Wait a moment for the status update to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await supabase.auth.signOut();
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[Logout] Error during logout:', error);
    return { success: false, error: 'Failed to logout' };
  }
}

export async function updateUsername(newUsername: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  await updateRecord<User>({
    table: 'users',
    data: { username: newUsername },
    match: { id: user.id },
    options: {
      revalidatePath: '/'
    }
  });

  return { success: true };
}
