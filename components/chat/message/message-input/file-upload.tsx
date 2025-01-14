"use client"

import React from "react"
import type { UiFileAttachment } from "@/types/messages-ui"
import { FileIcon } from "lucide-react"

interface FileUploadProps {
  uploadedFiles: UiFileAttachment[]
  onRemoveFile: (index: number) => void
}

export function FileUpload({ uploadedFiles, onRemoveFile }: FileUploadProps) {
  if (uploadedFiles.length === 0) return null

  return (
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
  )
} 