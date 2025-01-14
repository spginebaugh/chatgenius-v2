"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateUsername } from "@/app/actions/profile"
import { toast } from "sonner"
import type { User } from "@/types/database"

interface ProfileSettingsPanelProps {
  currentUsername: string | null
  onClose: () => void
}

export function ProfileSettingsPanel({ 
  currentUsername,
  onClose,
}: ProfileSettingsPanelProps) {
  const [username, setUsername] = useState(currentUsername || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (username === currentUsername || !username.trim()) return

    setIsSubmitting(true)
    try {
      const result = await updateUsername({ username: username.trim() })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Username updated successfully")
        onClose()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update username")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="h-14 bg-[#333F48] flex items-center justify-between px-4">
        <div className="text-white font-semibold">Profile Settings</div>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full"
              required
              minLength={3}
              maxLength={30}
            />
            <p className="mt-1 text-sm text-gray-500">
              Username must be between 3 and 30 characters and can only contain letters, numbers, underscores, and hyphens.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#BF5700] hover:bg-[#A64A00] text-white"
            disabled={username === currentUsername || !username.trim() || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Username"}
          </Button>
        </form>
      </div>
    </div>
  )
} 