"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Image as ImageIcon
} from "lucide-react"
import { THEME_COLORS } from "../../shared"

interface FormattingButtonProps {
  icon: React.ReactNode
  command: string
  value?: string
  onClick?: () => void
}

function FormattingButton({ icon, command, value, onClick }: FormattingButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      onClick={() => onClick ? onClick() : document.execCommand(command, false, value)}
    >
      {icon}
    </Button>
  )
}

interface FormattingToolbarProps {
  linkUrl: string
  setLinkUrl: (url: string) => void
  isLinkPopoverOpen: boolean
  setIsLinkPopoverOpen: (isOpen: boolean) => void
  insertLink: () => void
  isUploading: boolean
  onFileInputClick: () => void
}

export function FormattingToolbar({
  linkUrl,
  setLinkUrl,
  isLinkPopoverOpen,
  setIsLinkPopoverOpen,
  insertLink,
  isUploading,
  onFileInputClick
}: FormattingToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <FormattingButton icon={<Bold className="h-4 w-4" />} command="bold" />
      <FormattingButton icon={<Italic className="h-4 w-4" />} command="italic" />
      <FormattingButton icon={<Strikethrough className="h-4 w-4" />} command="strikeThrough" />
      <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL"
              className="flex-1 p-1 text-sm border rounded"
            />
            <Button
              type="button"
              size="sm"
              onClick={insertLink}
              className={`bg-[${THEME_COLORS.primary}] hover:bg-[${THEME_COLORS.primaryHover}] text-white`}
            >
              Insert
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <FormattingButton icon={<List className="h-4 w-4" />} command="insertUnorderedList" />
      <FormattingButton icon={<ListOrdered className="h-4 w-4" />} command="insertOrderedList" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        onClick={onFileInputClick}
        disabled={isUploading}
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    </div>
  )
} 