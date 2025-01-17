"use client"

import { useCallback } from "react"
import TurndownService from "turndown"
import { toast } from "sonner"
import type { UiFileAttachment } from "@/types/messages-ui"

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

interface UseMessageSubmitProps {
  html: string
  uploadedFiles: UiFileAttachment[]
  isRagMode: boolean
  isImageGenerationMode: boolean
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => Promise<void>
  setHtml: (html: string) => void
  setUploadedFiles: () => void
}

interface UseMessageSubmitReturn {
  handleSubmit: (e?: React.FormEvent) => Promise<void>
}

export function useMessageSubmit({
  html,
  uploadedFiles,
  isRagMode,
  isImageGenerationMode,
  onSendMessage,
  setHtml,
  setUploadedFiles
}: UseMessageSubmitProps): UseMessageSubmitReturn {
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (html.trim() || uploadedFiles.length > 0) {
      const markdown = html.trim() ? turndownService.turndown(html) : ""
      
      if (markdown.trim() || uploadedFiles.length > 0) {
        try {
          await onSendMessage(markdown, uploadedFiles, isRagMode, isImageGenerationMode)
          setHtml("")
          setUploadedFiles()
          // Don't reset modes after sending - let user toggle them manually
        } catch (error) {
          console.error("Error sending message:", error)
          toast.error("Failed to send message. Please try again.")
        }
      }
    }
  }, [html, uploadedFiles, isRagMode, isImageGenerationMode, onSendMessage, setHtml, setUploadedFiles])

  return {
    handleSubmit
  }
} 