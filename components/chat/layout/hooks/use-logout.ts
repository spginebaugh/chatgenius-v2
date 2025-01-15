import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"

export function useLogout(currentUser: User) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      // Update user status to offline
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      if (updateError) {
        console.error("Failed to update user status:", updateError.message)
      }

      // Then sign out
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        console.error("Sign out failed:", signOutError.message)
        return
      }

      router.push("/sign-in")
    } catch (error) {
      console.error("Logout failed:", error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return { handleLogout }
} 