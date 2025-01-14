"use client"

import React, { useState, useRef } from "react"
import ContentEditable, { ContentEditableEvent } from "react-contenteditable"
import TurndownService from "turndown"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"
import { THEME_COLORS, MESSAGE_INPUT_CONFIG } from "../../shared"
import type { UiFileAttachment } from "@/types/messages-ui"
import { FormattingToolbar } from "./formatting-toolbar"
import { FileUpload } from "./file-upload"
import { RagQueryButton } from "../rag-query-button"

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

interface MessageInputProps {
  placeholder: string
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean) => Promise<void>
  isLoading?: boolean
}

export function MessageInput({ 
  placeholder, 
  onSendMessage, 
  isLoading = false
}: MessageInputProps) {
  const [html, setHtml] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UiFileAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isRagMode, setIsRagMode] = useState(false)
  const contentEditableRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (html.trim() || uploadedFiles.length > 0) {
      const markdown = html.trim() ? turndownService.turndown(html) : ""
      
      if (markdown.trim() || uploadedFiles.length > 0) {
        try {
          await onSendMessage(markdown, uploadedFiles, isRagMode)
          setHtml("")
          setUploadedFiles([])
          // Don't reset RAG mode after sending - let user toggle it manually
        } catch (error) {
          console.error("Error sending message:", error)
          toast.error("Failed to send message. Please try again.")
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Let the default behavior handle new line
        document.execCommand('insertLineBreak')
        e.preventDefault()
        return
      }
      // Enter without shift sends the message
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true)
    try {
      const newFiles: UiFileAttachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log('File MIME type:', file.type)
        const fileName = `${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file)

        if (error) {
          toast.error(`Failed to upload ${file.name}`)
          throw error
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName)

        // Determine file type based on MIME type
        let fileType: 'image' | 'video' | 'audio' | 'document'
        
        console.log('Is image?', file.type.startsWith('image/'))
        console.log('Full file object:', {
          name: file.name,
          type: file.type,
          size: file.size
        })

        if (file.type.startsWith('image/')) {
          fileType = 'image'
        } else if (file.type.startsWith('video/')) {
          fileType = 'video'
        } else if (file.type.startsWith('audio/')) {
          fileType = 'audio'
        } else {
          fileType = 'document'
        }

        console.log('Determined fileType:', fileType)

        newFiles.push({
          url: publicUrl,
          type: fileType,
          name: file.name
        })
      }
      setUploadedFiles(prev => [...prev, ...newFiles])
    } catch (error) {
      console.error('Error in handleFileUpload:', error)
      toast.error("Failed to upload one or more files")
    } finally {
      setIsUploading(false)
    }
  }

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    if (contentEditableRef.current) {
      contentEditableRef.current.focus()
    }
  }

  const handleChange = (evt: ContentEditableEvent) => {
    setHtml(evt.target.value)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const insertLink = () => {
    if (linkUrl) {
      execCommand("createLink", linkUrl)
      setLinkUrl("")
      setIsLinkPopoverOpen(false)
    }
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <FormattingToolbar
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            isLinkPopoverOpen={isLinkPopoverOpen}
            setIsLinkPopoverOpen={setIsLinkPopoverOpen}
            insertLink={insertLink}
            isUploading={isUploading}
            onFileInputClick={() => fileInputRef.current?.click()}
          />
          <FileUpload
            uploadedFiles={uploadedFiles}
            onRemoveFile={(index) => {
              const newFiles = [...uploadedFiles]
              newFiles.splice(index, 1)
              setUploadedFiles(newFiles)
            }}
          />
          <div className="flex items-end gap-2">
            <div 
              className="flex-1"
              onKeyDown={handleKeyDown}
            >
              <ContentEditable
                innerRef={contentEditableRef}
                html={html}
                onChange={handleChange}
                onPaste={handlePaste}
                className={`min-h-[${MESSAGE_INPUT_CONFIG.minHeight}] max-h-[${MESSAGE_INPUT_CONFIG.maxHeight}] overflow-y-auto w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:border-[${THEME_COLORS.primary}] focus:ring-1 focus:ring-[${THEME_COLORS.primary}] ${isLoading ? 'opacity-50' : ''}`}
                placeholder={isRagMode ? "Ask a question about your documents..." : placeholder}
                tagName="div"
                disabled={isLoading}
              />
            </div>
            <RagQueryButton
              isActive={isRagMode}
              onClick={() => setIsRagMode(!isRagMode)}
              disabled={isUploading || isLoading}
            />
            <Button 
              type="submit"
              size="icon"
              className={`h-10 w-10 rounded-full bg-[${THEME_COLORS.primary}] hover:bg-[${THEME_COLORS.primaryHover}] text-white shadow-md`}
              disabled={isUploading || isLoading}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </form>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="*/*"
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
    </div>
  )
}