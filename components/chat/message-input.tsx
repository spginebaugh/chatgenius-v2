"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Code,
  ArrowUp,
  Image as ImageIcon
} from "lucide-react"
import ContentEditable, { ContentEditableEvent } from "react-contenteditable"
import TurndownService from "turndown"
import { createClient } from "@/lib/supabase/client"
import type { MessageFile } from "@/types/database"
import { toast } from "sonner"

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

interface FileAttachment {
  url: string
  type: 'image' | 'video' | 'audio' | 'document'
  name: string
}

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
  const supabase = createClient()

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (html.trim() || uploadedFiles.length > 0) {
      // Convert HTML to Markdown
      const markdown = html.trim() ? turndownService.turndown(html) : ""
      
      if (markdown.trim() || uploadedFiles.length > 0) {
        try {
          console.log('Sending message with files:', uploadedFiles)
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
      console.log('Starting file upload for files:', files)
      const newFiles: FileAttachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
          console.log('Processing image file:', file.name)
          const fileName = `${Date.now()}-${file.name}`
          const { data, error } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file)

          if (error) {
            console.error('Storage upload error:', error)
            toast.error(`Failed to upload ${file.name}`)
            throw error
          }

          console.log('File uploaded to storage:', data)

          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileName)

          console.log('Public URL generated:', publicUrl)

          newFiles.push({
            url: publicUrl,
            type: 'image',
            name: file.name
          })
          console.log('Added file to upload list:', newFiles[newFiles.length - 1])
        }
      }
      console.log('Setting uploaded files:', newFiles)
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
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => execCommand("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => execCommand("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => execCommand("strikeThrough")}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
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
                    className="bg-[#BF5700] hover:bg-[#A64A00] text-white"
                  >
                    Insert
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => execCommand("insertUnorderedList")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => execCommand("insertOrderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Message Input with Send Button */}
          <div className="relative flex flex-col gap-2">
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={file.url} 
                      alt={file.name}
                      className="h-20 w-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  className="min-h-[75px] max-h-[200px] overflow-y-auto w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:border-[#BF5700] focus:ring-1 focus:ring-[#BF5700]"
                  placeholder={placeholder}
                  tagName="div"
                />
              </div>
              <Button 
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full bg-[#BF5700] hover:bg-[#A64A00] text-white shadow-md"
                disabled={isUploading}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
} 