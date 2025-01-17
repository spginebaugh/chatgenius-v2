"use client"

import React, { useRef } from "react"
import ContentEditable, { ContentEditableEvent } from "react-contenteditable"
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"
import { THEME_COLORS, MESSAGE_INPUT_CONFIG } from "../../shared"
import type { UiFileAttachment } from "@/types/messages-ui"
import { FormattingToolbar } from "./formatting-toolbar"
import { FileUpload } from "./file-upload"
import { RagQueryButton } from "../rag-query-button"
import { useMessageInput } from "./use-message-input"
import { useFileUpload } from "./use-file-upload"
import { useMessageSubmit } from "./use-message-submit"

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
      className={`min-h-[${MESSAGE_INPUT_CONFIG.minHeight}] max-h-[${MESSAGE_INPUT_CONFIG.maxHeight}] overflow-y-auto w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:border-[${THEME_COLORS.primary}] focus:ring-1 focus:ring-[${THEME_COLORS.primary}] ${isLoading ? 'opacity-50' : ''}`}
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
  const contentEditableRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custom hooks for different functionalities
  const {
    html,
    linkUrl,
    isLinkPopoverOpen,
    isRagMode,
    isImageGenerationMode,
    handleChange,
    handlePaste,
    handleKeyDown,
    execCommand,
    setLinkUrl,
    setIsLinkPopoverOpen,
    setIsRagMode,
    setIsImageGenerationMode
  } = useMessageInput({ contentEditableRef })

  const {
    uploadedFiles,
    isUploading,
    handleFileUpload,
    handleRemoveFile
  } = useFileUpload()

  const { handleSubmit } = useMessageSubmit({
    html,
    uploadedFiles,
    isRagMode,
    isImageGenerationMode,
    onSendMessage,
    setHtml: (html: string) => handleChange({ target: { value: html } } as ContentEditableEvent),
    setUploadedFiles: () => handleRemoveFile(-1) // Remove all files
  })

  const insertLink = () => {
    if (linkUrl) {
      execCommand("createLink", linkUrl)
      setLinkUrl("")
      setIsLinkPopoverOpen(false)
    }
  }

  const getPlaceholder = () => {
    if (isRagMode) return "Ask a question about your documents..."
    if (isImageGenerationMode) return "Describe the image you want to generate..."
    return placeholder
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
            onRemoveFile={handleRemoveFile}
          />

          <div className="flex items-end gap-2">
            <div 
              className="flex-1"
              onKeyDown={handleKeyDown}
            >
              <InputContainer isLoading={isLoading}>
                <ContentEditable
                  innerRef={contentEditableRef}
                  html={html}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  placeholder={getPlaceholder()}
                  tagName="div"
                  disabled={isLoading}
                />
              </InputContainer>
            </div>

            <RagQueryButton
              isActive={isRagMode || isImageGenerationMode}
              onClick={() => {
                setIsRagMode(!isRagMode)
                if (isImageGenerationMode) setIsImageGenerationMode(false)
              }}
              onImageGenerate={() => {
                setIsImageGenerationMode(!isImageGenerationMode)
                if (isRagMode) setIsRagMode(false)
              }}
              disabled={isUploading || isLoading}
            />

            <SendButton isDisabled={isUploading || isLoading} />
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