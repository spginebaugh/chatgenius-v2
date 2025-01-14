"use client"

import React, { useState, useRef } from "react"
import ContentEditable, { ContentEditableEvent } from "react-contenteditable"
import TurndownService from "turndown"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"
import { FileAttachment, THEME_COLORS, MESSAGE_INPUT_CONFIG } from "../../shared"
import { FormattingToolbar } from "./formatting-toolbar"
import { FileUpload } from "./file-upload"

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

interface MessageInputProps {
  placeholder: string
  onSendMessage: (message: string, files?: FileAttachment[]) => Promise<void>
}

export function MessageInput({ placeholder, onSendMessage }: MessageInputProps) {
  const [html, setHtml] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const contentEditableRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (html.trim() || uploadedFiles.length > 0) {
      const markdown = html.trim() ? turndownService.turndown(html) : ""
      
      if (markdown.trim() || uploadedFiles.length > 0) {
        try {
          await onSendMessage(markdown, uploadedFiles)
          setHtml("")
          setUploadedFiles([])
        } catch (error) {
          console.error("Error sending message:", error)
          toast.error("Failed to send message. Please try again.")
        }
      }
    }
  }

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true)
    try {
      const newFiles: FileAttachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
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

          newFiles.push({
            url: publicUrl,
            type: 'image',
            name: file.name
          })
        }
      }
      setUploadedFiles(prev => [...prev, ...newFiles])
    } catch (error) {
      console.error('Error in handleFileUpload:', error)
      toast.error("Failed to upload one or more files")
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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
    <div className="sticky bottom-0 px-4 py-3 bg-white border-t border-gray-200">
      <form onSubmit={handleSubmit}>
        <div className="space-y-2">
          <FormattingToolbar
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            isLinkPopoverOpen={isLinkPopoverOpen}
            setIsLinkPopoverOpen={setIsLinkPopoverOpen}
            insertLink={insertLink}
            isUploading={isUploading}
            onFileInputClick={() => fileInputRef.current?.click()}
          />

          <div className="relative flex flex-col gap-2">
            <FileUpload
              uploadedFiles={uploadedFiles}
              onRemoveFile={(index) => setUploadedFiles(files => files.filter((_, i) => i !== index))}
            />

            <div className="flex items-end gap-2">
              <div 
                onKeyPress={handleKeyPress}
                className="flex-1"
              >
                <ContentEditable
                  innerRef={contentEditableRef}
                  html={html}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  className={`min-h-[${MESSAGE_INPUT_CONFIG.minHeight}] max-h-[${MESSAGE_INPUT_CONFIG.maxHeight}] overflow-y-auto w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:border-[${THEME_COLORS.primary}] focus:ring-1 focus:ring-[${THEME_COLORS.primary}]`}
                  placeholder={placeholder}
                  tagName="div"
                />
              </div>
              <Button 
                type="submit"
                size="icon"
                className={`h-10 w-10 rounded-full bg-[${THEME_COLORS.primary}] hover:bg-[${THEME_COLORS.primaryHover}] text-white shadow-md`}
                disabled={isUploading}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
    </div>
  )
} 