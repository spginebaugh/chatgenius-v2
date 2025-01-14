"use server";

import { encodedRedirect } from "@/lib/utils";
import { createServerClient } from "@/app/_lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { updateRecord, selectRecords } from '@/app/_lib/supabase';
import type { User, Channel } from '@/types/database';

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const origin = (await headers()).get("origin")

  const supabase = await createServerClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/sign-up?message=${encodeURIComponent(error.message)}`)
  }

  redirect("/sign-in?message=Check your email to confirm your account")
}

export const signInAction = async (formData: FormData) => {
  console.log('[SignInAction] Starting sign-in process');
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  console.log('[SignInAction] Email:', email);

  const supabase = await createServerClient();
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

  try {
    // First check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!existingUser) {
      // Create user record if it doesn't exist
      await supabase
        .from('users')
        .insert({
          id: data.user.id,
          username: email.split('@')[0],
          status: 'ONLINE',
          last_active_at: new Date().toISOString()
        });
    } else {
      // Update existing user's status
      await updateRecord<User>({
        table: 'users',
        data: { 
          status: 'ONLINE',
          last_active_at: new Date().toISOString()
        },
        match: { id: data.user.id }
      });
    }

    // Get the first channel or default to channel 1
    const channels = await selectRecords<Channel>({
      table: 'channels',
      select: 'id',
      options: {
        errorMap: {
          NOT_FOUND: { 
            message: 'No channels found',
            status: 404
          }
        }
      }
    });
    
    const channelId = channels?.[0]?.id || 1;
    return redirect(`/channel/${channelId}`);
  } catch (error) {
    console.error('[SignInAction] Error updating user status:', error);
    // Continue with redirect even if status update fails
    return redirect(`/channel/1`);
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createServerClient();
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
  const supabase = await createServerClient();

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
  const supabase = await createServerClient();
  
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
        match: { id: user.id },
        options: {
          errorMap: {
            NOT_FOUND: {
              message: 'User profile not found',
              status: 404
            }
          }
        }
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
  const supabase = await createServerClient();
  
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
        match: { id: user.id },
        options: {
          errorMap: {
            NOT_FOUND: {
              message: 'User profile not found',
              status: 404
            }
          }
        }
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
  const supabase = await createServerClient();
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
