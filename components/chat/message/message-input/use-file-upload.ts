"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { UiFileAttachment } from "@/types/messages-ui"

interface UseFileUploadReturn {
  uploadedFiles: UiFileAttachment[]
  isUploading: boolean
  handleFileUpload: (files: FileList) => Promise<void>
  handleRemoveFile: (index: number) => void
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploadedFiles, setUploadedFiles] = useState<UiFileAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const determineFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true)
    try {
      const newFiles: UiFileAttachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = `${Date.now()}-${file.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file)

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`)
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName)

        newFiles.push({
          url: publicUrl,
          type: determineFileType(file),
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
  }, [supabase])

  const handleRemoveFile = useCallback((index: number) => {
    if (index === -1) {
      // Remove all files
      setUploadedFiles([])
    } else {
      setUploadedFiles(prev => {
        const newFiles = [...prev]
        newFiles.splice(index, 1)
        return newFiles
      })
    }
  }, [])

  return {
    uploadedFiles,
    isUploading,
    handleFileUpload,
    handleRemoveFile
  }
} 