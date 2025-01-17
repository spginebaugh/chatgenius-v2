"use client"

import { useState, useCallback } from "react"
import type { ContentEditableEvent } from "react-contenteditable"

interface UseMessageInputProps {
  contentEditableRef: React.RefObject<any>
}

interface UseMessageInputReturn {
  html: string
  linkUrl: string
  isLinkPopoverOpen: boolean
  isRagMode: boolean
  isImageGenerationMode: boolean
  handleChange: (evt: ContentEditableEvent) => void
  handlePaste: (e: React.ClipboardEvent) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  execCommand: (command: string, value?: string) => void
  setLinkUrl: (url: string) => void
  setIsLinkPopoverOpen: (isOpen: boolean) => void
  setIsRagMode: (isRagMode: boolean) => void
  setIsImageGenerationMode: (isImageGenerationMode: boolean) => void
}

export function useMessageInput({ contentEditableRef }: UseMessageInputProps): UseMessageInputReturn {
  const [html, setHtml] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [isRagMode, setIsRagMode] = useState(false)
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false)

  const execCommand = useCallback((command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    if (contentEditableRef.current) {
      contentEditableRef.current.focus()
    }
  }, [contentEditableRef])

  const handleChange = useCallback((evt: ContentEditableEvent) => {
    setHtml(evt.target.value)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Let the default behavior handle new line
        document.execCommand('insertLineBreak')
        e.preventDefault()
        return
      }
      // Enter without shift sends the message
      e.preventDefault()
      // handleSubmit will be called by the form submit handler
    }
  }, [])

  return {
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
  }
} 