import type { UiFileAttachment } from "@/types/messages-ui"

interface MessageFilesProps {
  files?: UiFileAttachment[]
}

export function MessageFiles({ files }: MessageFilesProps) {
  if (!files?.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => (
        file.type === 'image' && (
          <a 
            key={index} 
            href={file.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <img 
              src={file.url} 
              alt="Attached image"
              className="max-h-60 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow"
            />
          </a>
        )
      ))}
    </div>
  )
} 