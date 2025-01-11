"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ProfileSettingsPanelProps {
  currentUsername: string
  onClose: () => void
  onUpdateUsername: (newUsername: string) => Promise<void>
}

export function ProfileSettingsPanel({ 
  currentUsername,
  onClose,
  onUpdateUsername
}: ProfileSettingsPanelProps) {
  const [username, setUsername] = useState(currentUsername)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (username === currentUsername) return

    setIsSubmitting(true)
    try {
      await onUpdateUsername(username)
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
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#BF5700] hover:bg-[#A64A00] text-white"
            disabled={username === currentUsername || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Username"}
          </Button>
        </form>
      </div>
    </div>
  )
} 