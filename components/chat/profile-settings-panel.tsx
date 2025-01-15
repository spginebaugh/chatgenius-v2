"use client"

// Imports
// -----------------------------------------------
import { useState } from "react"
import { toast } from "sonner"
import { updateUsername } from "@/app/actions/profile"

// Types
// -----------------------------------------------
import type { ProfileSettingsPanelProps } from "./shared/types"

// Components
// -----------------------------------------------
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// Internal Types
// -----------------------------------------------
interface PanelHeaderProps {
  onClose: () => void
}

interface UsernameFormProps {
  currentUsername: string | null
  onSubmitSuccess: () => void
}

// Hook Logic
// -----------------------------------------------
function useUsernameForm({ currentUsername, onSubmitSuccess }: {
  currentUsername: string | null
  onSubmitSuccess: () => void
}) {
  const [username, setUsername] = useState(currentUsername || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isValid = username.trim() !== '' && username !== currentUsername
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    try {
      const result = await updateUsername({ username: username.trim() })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Username updated successfully")
        onSubmitSuccess()
      }
    } catch (error) {
      console.error('Error updating username:', error)
      toast.error("Failed to update username. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    username,
    setUsername,
    isSubmitting,
    isValid,
    handleSubmit
  }
}

// UI Components
// -----------------------------------------------
function PanelHeader({ onClose }: PanelHeaderProps) {
  return (
    <div className="h-14 bg-[#333F48] flex items-center justify-between px-4">
      <div className="text-white font-semibold">Profile Settings</div>
      <button 
        onClick={onClose}
        className="text-white hover:text-gray-300"
      >
        ✕
      </button>
    </div>
  )
}

function UsernameForm({ currentUsername, onSubmitSuccess }: UsernameFormProps) {
  const {
    username,
    setUsername,
    isSubmitting,
    isValid,
    handleSubmit
  } = useUsernameForm({ currentUsername, onSubmitSuccess })

  return (
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
        className="w-full bg-[#333F48] hover:bg-[#4A5C68] text-white"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? "Updating..." : "Update Username"}
      </Button>
    </form>
  )
}

// Main Component
// -----------------------------------------------
export function ProfileSettingsPanel({ 
  currentUsername,
  onClose,
}: ProfileSettingsPanelProps) {
  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white h-full">
      <PanelHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4">
        <UsernameForm 
          currentUsername={currentUsername}
          onSubmitSuccess={onClose}
        />
      </div>
    </div>
  )
} 