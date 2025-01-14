'use server'

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { Document } from '@langchain/core/documents'

export interface ProcessedFile {
  text: string
  metadata: {
    source: string
    fileName: string
    fileType: string
    pageContent?: string
  }
}

export async function processFile(
  file: Buffer,
  fileName: string
): Promise<ProcessedFile> {
  const fileType = fileName.split('.').pop()?.toLowerCase()

  if (!fileType) {
    throw new Error('File type could not be determined')
  }

  let text: string
  
  switch (fileType) {
    case 'pdf':
      const loader = new PDFLoader(new Blob([file]))
      const docs = await loader.load()
      text = docs.map((doc: Document) => doc.pageContent).join('\n')
      break
      
    case 'txt':
      text = Buffer.from(file).toString('utf-8')
      break
      
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }

  return {
    text,
    metadata: {
      source: fileName,
      fileName,
      fileType
    }
  }
} 