import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

export interface TextChunk {
  text: string
  metadata: Record<string, any>
}

export async function splitIntoChunks(
  text: string,
  metadata: Record<string, any>,
  options = {
    chunkSize: 500,
    chunkOverlap: 50
  }
): Promise<TextChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap
  })

  const docs = await splitter.createDocuments([text])
  
  return docs.map((doc) => ({
    text: doc.pageContent,
    metadata: {
      ...metadata,
      chunk_size: options.chunkSize,
      chunk_overlap: options.chunkOverlap
    }
  }))
} 