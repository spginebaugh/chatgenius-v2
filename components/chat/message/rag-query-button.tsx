"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Bot, Image, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RagQueryButtonProps {
  isActive: boolean
  onClick: () => void
  onImageGenerate?: () => void
  disabled?: boolean
}

export function RagQueryButton({
  isActive,
  onClick,
  onImageGenerate,
  disabled = false
}: RagQueryButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          size="icon"
          className={`relative h-9 w-9 shrink-0 overflow-visible ${
            isActive 
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
              : "bg-gray-700 hover:bg-gray-800"
          }`}
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onClick}>
          <Search className="mr-2 h-4 w-4" />
          <span>Search documents (RAG)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImageGenerate}>
          <Image className="mr-2 h-4 w-4" />
          <span>Generate Image</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 