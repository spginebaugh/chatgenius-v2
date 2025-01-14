"use client"

import React from "react"
import { FileAttachment } from "../../shared"

interface FileUploadProps {
  uploadedFiles: FileAttachment[]
  onRemoveFile: (index: number) => void
}

export function FileUpload({ uploadedFiles, onRemoveFile }: FileUploadProps) {
  if (uploadedFiles.length === 0) return null

  return (
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
            onClick={() => onRemoveFile(index)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
} 