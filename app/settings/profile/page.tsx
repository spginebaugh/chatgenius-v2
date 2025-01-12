import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import ProfileSettings from "./profile-settings-form"

// Opt out of static rendering
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    return <ProfileSettings />
  } catch (error) {
    // Handle case where env vars aren't available during prerendering
    if (error instanceof Error && error.message.includes('URL and API key are required')) {
      return null // Return null during build time
    }
    throw error // Re-throw other errors
  }
} 