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
  onSubmitWithRag: () => void
  onSubmitWithImageGen: () => void
  disabled?: boolean
}

export function RagQueryButton({
  onSubmitWithRag,
  onSubmitWithImageGen,
  disabled = false
}: RagQueryButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0 overflow-visible bg-gray-700 hover:bg-gray-800"
          disabled={disabled}
        >
          <Bot className="h-5 w-5 text-gray-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onSubmitWithRag}>
          <Search className="mr-2 h-4 w-4" />
          <span>Search documents (RAG)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSubmitWithImageGen}>
          <Image className="mr-2 h-4 w-4" />
          <span>Generate Image</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 