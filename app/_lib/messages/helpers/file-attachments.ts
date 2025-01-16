import { MessageFile, FileType } from '@/types/database'
import { UiFileAttachment } from '@/types/messages-ui'
import { insertRecord } from '../../supabase'
import { createClient } from '@/app/_lib/supabase-server'

const VALID_FILE_TYPES = ['image', 'video', 'audio', 'document'] as const

function validateFileType(type: string): FileType {
  if (!VALID_FILE_TYPES.includes(type as FileType)) {
    throw new Error(`Invalid file type: ${type}. Must be one of: ${VALID_FILE_TYPES.join(', ')}`)
  }
  return type as FileType
}

interface HandleFileAttachmentsProps {
  messageId: number
  files: UiFileAttachment[]
  userId: string
}

/**
 * Handles file attachments for messages
 */
export async function handleFileAttachments({
  messageId,
  files,
  userId
}: HandleFileAttachmentsProps) {
  const fileRecords = files.map(file => ({
    message_id: messageId,
    file_url: file.url,
    file_type: validateFileType(file.type),
    inserted_at: new Date().toISOString()
  }))

  // Insert first file using our helper
  await insertRecord<MessageFile>({
    table: 'message_files',
    data: fileRecords[0],
    options: {
      revalidatePath: '/channel/[id]'
    }
  })

  // Insert remaining files if any
  if (fileRecords.length > 1) {
    const supabase = await createClient()
    const { error } = await supabase.from('message_files').insert(fileRecords.slice(1))
    if (error) throw error
  }
} 