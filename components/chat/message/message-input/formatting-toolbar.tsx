"use client"

import React from "react"
import { type Editor } from '@tiptap/react'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react"

interface FormattingButtonProps {
  icon: React.ReactNode
  onClick: () => void
  isActive?: boolean
}

function FormattingButton({ icon, onClick, isActive }: FormattingButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`}
      onClick={onClick}
    >
      {icon}
    </Button>
  )
}

interface FormattingToolbarProps {
  editor: Editor | null
}

export function FormattingToolbar({ editor }: FormattingToolbarProps) {
  const [linkUrl, setLinkUrl] = React.useState('')

  if (!editor) {
    return null
  }

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
    }
  }

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 pb-2 mb-2">
      <FormattingButton
        icon={<Bold className="h-4 w-4" />}
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      />
      <FormattingButton
        icon={<Italic className="h-4 w-4" />}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
      />
      <FormattingButton
        icon={<Strikethrough className="h-4 w-4" />}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Paste link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLink()
                }
              }}
            />
            <Button onClick={addLink} size="sm">
              Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <FormattingButton
        icon={<List className="h-4 w-4" />}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      />
      <FormattingButton
        icon={<ListOrdered className="h-4 w-4" />}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      />
    </div>
  )
} 