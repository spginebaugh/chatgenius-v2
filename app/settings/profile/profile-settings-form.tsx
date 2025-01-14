"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { updateUsername } from "@/app/actions/profile"
import { toast } from "sonner"

interface ProfileSettingsFormProps {
  currentUsername: string | null
}

export default function ProfileSettingsForm({ currentUsername }: ProfileSettingsFormProps) {
  const [username, setUsername] = useState(currentUsername || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await updateUsername({ username })
      if (error) {
        toast.error(error)
      } else {
        toast.success("Username updated successfully")
        router.refresh()
        router.push("/")
      }
    } catch (error) {
      toast.error("Failed to update username. Please try again.")
      console.error("Error updating username:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-medium mb-8">Profile Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your new username"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Username must be between 3 and 20 characters and can only contain letters, numbers, underscores, and hyphens.
          </p>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Username"}
        </Button>
      </form>
    </div>
  )
} 