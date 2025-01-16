import { createClient } from '@/app/_lib/supabase-server'
import { processAndStoreFile } from '@/lib/rag/rag-service'
import type { FileType } from '@/types/database'

const VALID_FILE_TYPES = ['image', 'video', 'audio', 'document'] as const

// Define RAG-compatible document types
const RAG_COMPATIBLE_EXTENSIONS = ['.pdf', '.txt', '.md', '.doc', '.docx'] as const

function validateFileType(type: string): FileType {
  if (!VALID_FILE_TYPES.includes(type as FileType)) {
    throw new Error(`Invalid file type: ${type}. Must be one of: ${VALID_FILE_TYPES.join(', ')}`)
  }
  return type as FileType
}

function isRagCompatible(fileName: string): boolean {
  const extension = fileName.toLowerCase().match(/\.[^.]*$/)?.[0]
  return extension ? RAG_COMPATIBLE_EXTENSIONS.includes(extension as typeof RAG_COMPATIBLE_EXTENSIONS[number]) : false
}

export async function processFileAttachment(params: {
  messageId: number
  file: { type: string; url: string; name: string }
}) {
  const { messageId, file } = params
  const supabase = await createClient()
  
  // Validate file type
  const validatedFileType = validateFileType(file.type)
  
  // Insert file record with pending status
  const { data: fileData, error: fileError } = await supabase
    .from('message_files')
    .insert({
      message_id: messageId,
      file_type: validatedFileType,
      file_url: file.url,
      vector_status: 'pending',
      inserted_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (fileError) {
    console.error('Error inserting file:', { error: fileError, file, messageId })
    throw fileError
  }

  // Only process RAG-compatible document files
  if (validatedFileType === 'document' && isRagCompatible(file.name)) {
    try {
      // Update status to processing
      await supabase
        .from('message_files')
        .update({ vector_status: 'processing' })
        .eq('file_id', fileData.file_id)

      // Download file content
      const { data: fileContent, error: downloadError } = await supabase.storage
        .from('chat-attachments')
        .download(file.url.split('/').pop()!)

      if (downloadError) throw downloadError

      // Process file for RAG
      await processAndStoreFile(
        Buffer.from(await fileContent.arrayBuffer()),
        file.name,
        fileData.file_id
      )

      // Update status to completed
      await supabase
        .from('message_files')
        .update({ vector_status: 'completed' })
        .eq('file_id', fileData.file_id)

    } catch (error) {
      console.error('Error processing file for RAG:', error)
      // Update status to failed
      await supabase
        .from('message_files')
        .update({ vector_status: 'failed' })
        .eq('file_id', fileData.file_id)
    }
  }

  return fileData
} 