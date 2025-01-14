import { createClient } from "@/app/_lib/supabase-server"
import { redirect } from "next/navigation"
import ProfileSettingsForm from "./profile-settings-form"

export default async function ProfileSettingsPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error("Error fetching user:", error.message)
    redirect("/sign-in")
  }

  if (!user) {
    redirect("/sign-in")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="flex flex-col items-center justify-center w-full flex-1 px-4 text-center">
        <h1 className="text-4xl font-bold mb-8">Profile Settings</h1>
        <ProfileSettingsForm currentUsername={profile?.username} />
      </div>
    </div>
  )
} 