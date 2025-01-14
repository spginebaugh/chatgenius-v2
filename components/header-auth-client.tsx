"use client"

import { signOutAction } from "@/app/actions";
import { checkEnvVars } from "@/lib/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from 'sonner'

interface UserData {
  username: string | null;
  status: string | null;
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  error: string | null;
  envError: string | null;
}

function useEnvCheck() {
  const [envError, setEnvError] = useState<string | null>(null)

  useEffect(() => {
    const envCheck = checkEnvVars()
    if (!envCheck.isValid) {
      const errorMessage = [
        ...envCheck.missingVars.map(v => `Missing ${v}`),
        ...envCheck.invalidVars.map(v => `Invalid ${v}`)
      ].join(', ')
      setEnvError(errorMessage)
      toast.error(`Environment configuration error: ${errorMessage}`)
    }
  }, [])

  return envError
}

async function fetchUserData(user: User) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("users")
    .select("username, status")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return data
}

function useAuthState(envError: string | null): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    userData: null,
    error: null,
    envError
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (envError) throw new Error(envError)
        const supabase = createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError

        if (user) {
          const userData = await fetchUserData(user)
          setState({ user, userData, error: null, envError })
        } else {
          setState({ user: null, userData: null, error: null, envError })
        }
      } catch (err) {
        setState({
          user: null,
          userData: null,
          error: err instanceof Error ? err.message : 'An error occurred',
          envError
        })
      }
    }

    fetchUser()
  }, [envError])

  return state
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex gap-4 items-center">
      <Badge variant="destructive" className="font-normal">
        {error}
      </Badge>
    </div>
  )
}

function EnvErrorDisplay({ error }: { error: string }) {
  return (
    <div className="bg-destructive/15 p-4 rounded-md">
      <p className="text-sm text-destructive">Configuration Error: {error}</p>
    </div>
  )
}

function UserDropdown({ user, userData }: { user: User; userData: UserData | null }) {
  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <CircleIcon
              size={8}
              className={userData?.status === "ONLINE" ? "text-green-500" : "text-gray-500"}
              fill="currentColor"
            />
            {userData?.username || user.email}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">Change Username</Link>
          </DropdownMenuItem>
          <form action={signOutAction}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full text-left">
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AuthButtons() {
  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  )
}

export function AuthButton() {
  const envError = useEnvCheck()
  const { user, userData, error } = useAuthState(envError)

  if (envError) {
    return <EnvErrorDisplay error={envError} />
  }

  if (error) {
    return <ErrorDisplay error={error} />
  }

  return user ? (
    <UserDropdown user={user} userData={userData} />
  ) : (
    <AuthButtons />
  )
} 