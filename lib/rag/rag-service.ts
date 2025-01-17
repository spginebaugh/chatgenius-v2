'use server'

import { processFile, ProcessedFile } from './file-processor'
import { splitIntoChunks, TextChunk } from './text-chunker'
import { upsertVectors, queryVectors, VectorMetadata } from './pinecone-client'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { createClient } from '@/app/_lib/supabase-server'

const chat = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  streaming: true
})

const QA_PROMPT = PromptTemplate.fromTemplate(`
You are a helpful AI assistant that answers questions based on the provided context.
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know. Don't try to make up an answer.
If the context doesn't contain enough information, explain what specific information is missing.

Important instructions:
1. Base your answer ONLY on the provided context
2. If quoting from the context, use quotation marks
3. If multiple contexts provide conflicting information, point this out
4. If the context is technical, maintain the same level of technical detail in your response
5. Always mention which document/file the information comes from

Context: {context}

Question: {question}

Answer: Let me help you with that based on the available documents.`)

// Rate limiting helper
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10
const requestCounts = new Map<string, { count: number; timestamp: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = requestCounts.get(userId)

  if (!userRequests || (now - userRequests.timestamp) > RATE_LIMIT_WINDOW) {
    requestCounts.set(userId, { count: 1, timestamp: now })
    return true
  }

  if (userRequests.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }

  userRequests.count++
  return true
}

export async function processAndStoreFile(
  file: Buffer,
  fileName: string,
  fileId: number
): Promise<void> {
  const supabase = await createClient()
  
  // Process the file
  const processed = await processFile(file, fileName)
  
  // Split into chunks
  const chunks = await splitIntoChunks(processed.text, processed.metadata)
  
  // Store vectors in Pinecone
  await upsertVectors(
    chunks.map(chunk => chunk.text),
    chunks.map(chunk => ({
      text: chunk.text,
      source: processed.metadata.source,
      fileName: processed.metadata.fileName,
      fileType: processed.metadata.fileType,
      ...chunk.metadata
    }))
  )

  // Store vectors in local database
  const vectorRecords = chunks.map((chunk, index) => ({
    file_id: fileId,
    chunk_index: index,
    vector_id: `${processed.metadata.fileName}-${index}`,
    chunk_text: chunk.text,
    created_at: new Date().toISOString()
  }))

  // Use regular client for vector insertion since RLS is disabled
  const { error } = await supabase
    .from('vectors')
    .insert(vectorRecords)

  if (error) {
    console.error('Error storing vectors in database:', error)
    throw error
  }
}

export async function queryDocuments(
  question: string,
  userId: string,
  onToken?: (token: string) => void
): Promise<{ content: string; error?: string }> {
  try {
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return {
        content: '',
        error: 'Rate limit exceeded. Please wait a minute before trying again.'
      }
    }

    // Get relevant chunks with metadata
    const results = await queryVectors(question, undefined, 5) // Get top 5 chunks across all namespaces
    
    if (results.length === 0) {
      return {
        content: "I couldn't find any relevant information in the uploaded documents to answer your question. Try rephrasing your question or ensure the relevant documents have been uploaded."
      }
    }

    // Format context from chunks with source information
    const context = results
      .map(result => {
        const metadata = result.metadata
        return `[From ${metadata.fileName}]: ${metadata.text}`
      })
      .join('\n\n')

    // Generate answer
    const prompt = await QA_PROMPT.format({
      context,
      question
    })

    const response = await chat.invoke(prompt, {
      callbacks: onToken ? [{
        handleLLMNewToken: onToken
      }] : undefined
    })

    return { content: response.content as string }

  } catch (error) {
    console.error('Error in RAG query:', error)
    return {
      content: '',
      error: 'An error occurred while processing your question. Please try again.'
    }
  }
}

// Helper to get document status
export async function getDocumentStatus(fileId: number): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('message_files')
    .select('vector_status')
    .eq('file_id', fileId)
    .single()
    
  if (error) {
    console.error('Error getting document status:', error)
    return { status: 'failed', error: 'Could not retrieve document status' }
  }
  
  return { status: data.vector_status }
} 