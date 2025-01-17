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
  namespace?: string
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

  // Group vectors by filename (namespace)
  const vectorsByNamespace = vectors.reduce<Record<string, any[]>>((acc, vector, idx) => {
    const namespace = metadatas[idx].fileName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
    if (!acc[namespace]) {
      acc[namespace] = []
    }
    acc[namespace].push({
      id: `${namespace}-${idx}`,
      values: vector,
      metadata: {
        ...metadatas[idx],
        namespace
      }
    })
    return acc
  }, {})

  // Upsert vectors for each namespace
  for (const [namespace, records] of Object.entries(vectorsByNamespace)) {
    await index.namespace(namespace).upsert(records)
  }
}

export async function queryVectors(
  query: string,
  fileName?: string | string[] | null,
  topK: number = 3
) {
  const queryEmbedding = await embeddings.embedQuery(query)
  
  // If fileName is null, undefined, or empty array, query across all namespaces
  if (!fileName || (Array.isArray(fileName) && fileName.length === 0)) {
    // Get list of all namespaces
    const namespaces = await index.describeIndexStats()
    const allNamespaces = Object.keys(namespaces.namespaces || {})

    // Query each namespace and combine results
    const allResults = await Promise.all(
      allNamespaces.map(namespace =>
        index.namespace(namespace).query({
          vector: queryEmbedding,
          topK,
          includeMetadata: true
        })
      )
    )

    // Combine and sort results by score
    const combinedMatches = allResults
      .flatMap(result => result.matches || [])
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, topK)

    return combinedMatches.map((match: any) => ({
      score: match.score,
      metadata: match.metadata as VectorMetadata
    })) || []
  }

  // Handle string or array for filename
  const fileNameStr = Array.isArray(fileName) ? fileName[0] : fileName
  if (typeof fileNameStr !== 'string') {
    // If we get here and fileNameStr isn't a string, just query all namespaces
    const namespaces = await index.describeIndexStats()
    const allNamespaces = Object.keys(namespaces.namespaces || {})

    const allResults = await Promise.all(
      allNamespaces.map(namespace =>
        index.namespace(namespace).query({
          vector: queryEmbedding,
          topK,
          includeMetadata: true
        })
      )
    )

    const combinedMatches = allResults
      .flatMap(result => result.matches || [])
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, topK)

    return combinedMatches.map((match: any) => ({
      score: match.score,
      metadata: match.metadata as VectorMetadata
    })) || []
  }
    
  // Query specific namespace if we have a valid filename
  const namespace = fileNameStr.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const results = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true
  })
  return results.matches?.map((match: any) => ({
    score: match.score,
    metadata: match.metadata as VectorMetadata
  })) || []
} 