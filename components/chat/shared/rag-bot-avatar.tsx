"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

interface RagBotAvatarProps {
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10"
}

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 20
}

export function RagBotAvatar({ size = "md" }: RagBotAvatarProps) {
  return (
    <Avatar className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600`}>
      <AvatarFallback className="text-white">
        <Bot size={iconSizes[size]} />
      </AvatarFallback>
    </Avatar>
  )
} 