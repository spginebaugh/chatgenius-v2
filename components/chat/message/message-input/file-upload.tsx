"use client"

import React, { useRef } from "react"
import type { UiFileAttachment } from "@/types/messages-ui"
import { FileIcon, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  uploadedFiles: UiFileAttachment[]
  onRemoveFile: (index: number) => void
  onFileUpload: (files: FileList) => Promise<void>
  isUploading: boolean
}

export function FileUpload({ 
  uploadedFiles, 
  onRemoveFile, 
  onFileUpload,
  isUploading 
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="relative group">
              {file.type === 'image' ? (
                <img 
                  src={file.url} 
                  alt={file.name}
                  className="h-20 w-20 object-cover rounded"
                />
              ) : (
                <div className="h-20 w-20 flex items-center justify-center bg-gray-100 rounded">
                  <FileIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveFile(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="h-4 w-4" />
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="*/*"
        multiple
        onChange={(e) => e.target.files && onFileUpload(e.target.files)}
      />
    </div>
  )
} 