import { createClient } from '@/app/_lib/supabase-server'
import { processAndStoreFile } from '@/lib/rag/rag-service'
import type { FileType } from '@/types/database'

export async function processFileAttachment(params: {
  messageId: number
  file: { type: FileType; url: string; name: string }
}) {
  const { messageId, file } = params
  const supabase = await createClient()
  
  // Insert file record with pending status
  const { data: fileData, error: fileError } = await supabase
    .from('message_files')
    .insert({
      message_id: messageId,
      file_type: file.type,
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

  // Only process PDFs and text files for RAG
  if (file.type === 'document' && (file.name.endsWith('.pdf') || file.name.endsWith('.txt'))) {
    try {
      // Update status to processing
      await supabase
        .from('message_files')
        .update({ vector_status: 'processing' })
        .eq('id', fileData.id)

      // Download file content
      const { data: fileContent, error: downloadError } = await supabase.storage
        .from('chat-attachments')
        .download(file.url.split('/').pop()!)

      if (downloadError) throw downloadError

      // Process file for RAG
      await processAndStoreFile(
        Buffer.from(await fileContent.arrayBuffer()),
        file.name,
        fileData.id
      )

      // Update status to completed
      await supabase
        .from('message_files')
        .update({ vector_status: 'completed' })
        .eq('id', fileData.id)

    } catch (error) {
      console.error('Error processing file for RAG:', error)
      // Update status to failed
      await supabase
        .from('message_files')
        .update({ vector_status: 'failed' })
        .eq('id', fileData.id)
    }
  }

  return fileData
} 