"use client"

import React from "react"
import type { FileAttachment } from "../../shared"

interface MessageFilesProps {
  files: FileAttachment[]
}

export function MessageFiles({ files }: MessageFilesProps) {
  if (!files || files.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <div key={index} className="relative">
          <img 
            src={file.url} 
            alt={file.name}
            className="h-24 w-24 object-cover rounded"
          />
        </div>
      ))}
    </div>
  )
} 