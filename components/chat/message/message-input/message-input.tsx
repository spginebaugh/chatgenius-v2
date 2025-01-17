"use client"

import React, { useRef } from "react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"
import { THEME_COLORS, MESSAGE_INPUT_CONFIG } from "../../shared"
import type { UiFileAttachment } from "@/types/messages-ui"
import { FormattingToolbar } from "./formatting-toolbar"
import { FileUpload } from "./file-upload"
import { RagQueryButton } from "../rag-query-button"
import { useFileUpload } from "./use-file-upload"
import TurndownService from "turndown"

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

turndownService.addRule('strikethrough', {
  filter: function (node) {
    return (
      node.nodeName === 'DEL' ||
      node.nodeName === 'S' ||
      node.nodeName === 'STRIKE'
    )
  },
  replacement: function(content) {
    return '~~' + content + '~~'
  }
})

turndownService.addRule('italic', {
  filter: function (node) {
    return (
      node.nodeName === 'I' ||
      node.nodeName === 'EM'
    )
  },
  replacement: function(content) {
    return '*' + content + '*'
  }
})

interface MessageInputProps {
  placeholder: string
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => Promise<void>
  isLoading?: boolean
}

// Input Container Component
function InputContainer({ 
  children, 
  isLoading 
}: { 
  children: React.ReactNode
  isLoading: boolean 
}) {
  return (
    <div 
      className={`min-h-[${MESSAGE_INPUT_CONFIG.minHeight}] max-h-[${MESSAGE_INPUT_CONFIG.maxHeight}] overflow-y-auto w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-700 focus-within:outline-none focus-within:border-[${THEME_COLORS.primary}] focus-within:ring-1 focus-within:ring-[${THEME_COLORS.primary}] ${isLoading ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  )
}

// Send Button Component
function SendButton({ 
  isDisabled 
}: { 
  isDisabled: boolean 
}) {
  return (
    <Button 
      type="submit"
      size="icon"
      className={`h-10 w-10 rounded-full bg-[${THEME_COLORS.primary}] hover:bg-[${THEME_COLORS.primaryHover}] text-white shadow-md`}
      disabled={isDisabled}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  )
}

// Main Component
export function MessageInput({ 
  placeholder, 
  onSendMessage, 
  isLoading = false 
}: MessageInputProps) {
  const [lastShiftEnter, setLastShiftEnter] = React.useState<number>(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        if (!editor) return false

        // Regular Enter always submits
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleNormalSubmit()
          return true
        }

        // Handle Shift+Enter
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault()
          const now = Date.now()
          const timeSinceLastShiftEnter = now - lastShiftEnter
          
          // If in a list
          if (editor.isActive('listItem')) {
            // Double Shift+Enter within 500ms exits the list
            if (timeSinceLastShiftEnter < 500) {
              editor.chain()
                .lift('listItem')
                .run()
              setLastShiftEnter(0)
              return true
            }
            
            // Single Shift+Enter adds list item
            editor.chain()
              .splitListItem('listItem')
              .run()
            setLastShiftEnter(now)
            return true
          }
          
          // Not in a list - insert line break
          editor.chain()
            .insertContent('<br>')
            .run()
          return true
        }
        
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Handle content updates
    },
  })

  const {
    uploadedFiles,
    isUploading,
    handleFileUpload,
    handleRemoveFile
  } = useFileUpload()

  const handleSubmitWithRag = () => {
    if (editor?.getText().trim() || uploadedFiles.length > 0) {
      const markdown = editor?.getHTML() ? turndownService.turndown(editor.getHTML()) : ""
      onSendMessage(markdown, uploadedFiles, true, false)
      editor?.commands.setContent("")
      handleRemoveFile(-1)
    }
  }

  const handleSubmitWithImageGen = () => {
    if (editor?.getText().trim() || uploadedFiles.length > 0) {
      const markdown = editor?.getHTML() ? turndownService.turndown(editor.getHTML()) : ""
      onSendMessage(markdown, uploadedFiles, false, true)
      editor?.commands.setContent("")
      handleRemoveFile(-1)
    }
  }

  const handleNormalSubmit = () => {
    if (editor?.getText().trim() || uploadedFiles.length > 0) {
      const markdown = editor?.getHTML() ? turndownService.turndown(editor.getHTML()) : ""
      onSendMessage(markdown, uploadedFiles, false, false)
      editor?.commands.setContent("")
      handleRemoveFile(-1)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleNormalSubmit() }} className="flex gap-2">
      <div className="flex-1">
        <InputContainer isLoading={isLoading}>
          <FormattingToolbar editor={editor} />
          <div className="break-all break-words">
            <EditorContent editor={editor} />
          </div>
          <FileUpload
            uploadedFiles={uploadedFiles}
            onFileUpload={handleFileUpload}
            onRemoveFile={handleRemoveFile}
            isUploading={isUploading}
          />
        </InputContainer>
      </div>
      <div className="flex flex-col gap-2 justify-end">
        <RagQueryButton
          onSubmitWithRag={handleSubmitWithRag}
          onSubmitWithImageGen={handleSubmitWithImageGen}
          disabled={isUploading || isLoading || (!editor?.getText().trim() && !uploadedFiles.length)}
        />
        <SendButton isDisabled={isLoading || (!editor?.getText().trim() && !uploadedFiles.length)} />
      </div>
    </form>
  )
}