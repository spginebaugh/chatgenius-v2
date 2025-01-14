"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip"

interface RagQueryButtonProps {
  isActive: boolean
  onClick: () => void
  disabled?: boolean
}

export function RagQueryButton({
  isActive,
  onClick,
  disabled = false
}: RagQueryButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="icon"
            className={`relative h-9 w-9 shrink-0 overflow-visible ${
              isActive 
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                : "bg-gray-700 hover:bg-gray-800"
            }`}
            onClick={onClick}
            disabled={disabled}
          >
            <Bot className={`h-5 w-5 ${isActive ? "text-blue-700" : "text-gray-100"}`} />
            {isActive && (
              <div className="absolute -top-1 -right-1 h-3 w-3">
                <div className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></div>
                <div className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></div>
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Search documents (RAG)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 