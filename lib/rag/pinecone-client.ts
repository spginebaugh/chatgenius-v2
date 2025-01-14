'use server'

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing PINECONE_API_KEY')
}

if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('Missing PINECONE_ENVIRONMENT')
}

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('Missing PINECONE_INDEX_NAME')
}

const pc = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY
})

const index = pc.index(process.env.PINECONE_INDEX_NAME)

const embeddings = new OpenAIEmbeddings()

export interface VectorMetadata {
  text: string
  source: string
  fileName: string
  fileType: string
  [key: string]: any
}

export async function upsertVectors(
  texts: string[],
  metadatas: VectorMetadata[]
) {
  if (texts.length !== metadatas.length) {
    throw new Error('Number of texts and metadatas must match')
  }

  const vectors = await embeddings.embedDocuments(texts)

  const upsertRequests = vectors.map((vector, idx) => ({
    id: `${metadatas[idx].fileName}-${idx}`,
    values: vector,
    metadata: metadatas[idx]
  }))

  await index.upsert(upsertRequests)
}

export async function queryVectors(
  query: string,
  topK: number = 3
) {
  const queryEmbedding = await embeddings.embedQuery(query)

  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true
  })

  return results.matches?.map((match: any) => ({
    score: match.score,
    metadata: match.metadata as VectorMetadata
  })) || []
} 