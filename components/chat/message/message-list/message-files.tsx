"use client"

import React from "react"
import type { UiFileAttachment } from "@/types/messages-ui"
import { FileIcon } from "lucide-react"

interface MessageFilesProps {
  files: UiFileAttachment[]
}

export function MessageFiles({ files }: MessageFilesProps) {
  if (!files || files.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <div key={index} className="relative">
          {file.type === 'image' ? (
            <a 
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <img 
                src={file.url} 
                alt={file.name}
                className="h-24 w-24 object-cover rounded"
              />
            </a>
          ) : (
            <a 
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-gray-100 hover:bg-gray-200"
            >
              <FileIcon className="h-4 w-4" />
              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
            </a>
          )}
        </div>
      ))}
    </div>
  )
} 