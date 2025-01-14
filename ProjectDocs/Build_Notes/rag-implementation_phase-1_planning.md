# RAG Implementation with Pinecone, LangChain, and OpenAI

## Task Objective
Implement Retrieval Augmented Generation (RAG) for uploaded PDF and TXT files, enabling AI-powered document querying within the chat interface.

## Current State Assessment
- Users can upload PDF/TXT files to Supabase storage
- File links are stored in message_files table
- Basic chat functionality exists
- Vector storage and RAG capabilities partially implemented

## Future State Goal
- Files are automatically processed and vectorized upon upload
- Vectors stored in Pinecone.io
- Users can query document content through chat
- RAG_bot provides contextual responses based on document content
- Seamless integration with existing chat UI

## Implementation Plan

### 1. Setup Vector Database & Dependencies ✅
- [x] Set up Pinecone.io account and create index
- [x] Install required packages:
  ```bash
  npm install @pinecone-database/pinecone langchain @langchain/openai @langchain/pinecone pdf-parse
  ```
- [x] Add environment variables:
  ```
  PINECONE_API_KEY=
  PINECONE_ENVIRONMENT=
  PINECONE_INDEX_NAME=
  OPENAI_API_KEY=
  ```

### 2. Create Vector Processing Infrastructure ✅
- [x] Create `/lib/rag/` directory for RAG-related code
- [x] Implement file processing utilities:
  - [x] PDF text extraction (`file-processor.ts`)
  - [x] Text chunking (`text-chunker.ts`)
  - [x] Vector embedding generation (`pinecone-client.ts`)
- [x] Create Pinecone service wrapper (`pinecone-client.ts`)
- [x] Implement vector storage operations (`rag-service.ts`)

### 3. Database Schema Updates ✅
- [x] Add vectors table to track processed documents:
  ```sql
  create table vectors (
    id uuid primary key default uuid_generate_v4(),
    file_id uuid references message_files(id) on delete cascade,
    chunk_index integer,
    vector_id text,
    chunk_text text,
    created_at timestamp with time zone default now()
  );
  ```
- [x] Add vector processing status to message_files:
  ```sql
  alter table message_files add column vector_status text default 'pending';
  ```
Additional improvements:
- Added enum check constraint for vector_status
- Created RLS policies for vectors table
- Added cleanup trigger for deleted files
- Created indexes for common queries

### 4. File Upload Pipeline Enhancement ✅
- [x] Modify file upload handler to trigger vector processing
- [x] Implement background job for vector processing
- [x] Add error handling and retry mechanisms
- [x] Update file status upon successful vectorization

Additional improvements:
- Added status tracking in message_files table
- Implemented selective processing for PDF and TXT files only
- Added proper error handling and status updates
- Integrated with Supabase storage for file downloads

### 5. RAG Query Implementation ✅
- [x] Create RAG query service using LangChain
  - Implemented in `rag-service.ts` with GPT-4 Turbo
  - Added streaming support for real-time responses
- [x] Implement similarity search with Pinecone
  - Added top-5 chunks retrieval
  - Included source attribution in results
- [x] Design prompt templates for context injection
  - Created detailed prompt with specific instructions
  - Added source attribution requirements
  - Implemented conflict handling
- [x] Add response generation with OpenAI
  - Added streaming support
  - Implemented rate limiting (10 requests/minute)
  - Added error handling and fallbacks

Additional improvements:
- Added rate limiting with 10 requests per minute per user
- Implemented document status checking
- Added better error messages and handling
- Included source attribution in responses
- Added technical detail preservation instructions

### 6. Chat Interface Updates ✅
- [x] Add RAG-specific message type
  - Added 'rag' to message_type enum
  - Created RAG bot user with fixed UUID
  - Updated TypeScript types
- [x] Create RAG bot avatar and styling
  - Created RagBotAvatar component with gradient background
  - Added size variants (sm, md, lg)
  - Used Bot icon from Lucide
- [x] Create RAG message component
  - Added specialized RagMessage component
  - Implemented streaming support with skeleton loading
  - Added source attribution styling
  - Updated MessageItem to handle RAG messages
- [x] Create RAG query button
  - Added RagQueryButton component with active state
  - Implemented tooltip and animations
  - Added disabled state support
- [x] Update message input component
  - Added RAG mode toggle
  - Updated placeholder text for RAG mode
  - Added loading state during queries
  - Added vectorized file status check

Additional improvements:
- Added gradient background for RAG bot messages
- Implemented streaming UI with skeleton loading
- Added visual feedback for RAG mode
- Created consistent styling across components
- Added proper type support for vector status

### 7. Testing & Optimization
- [ ] Test file processing
  - [ ] Test PDF file processing with various sizes (1MB, 5MB, 10MB)
  - [ ] Test TXT file processing
  - [ ] Test unsupported file types (should be rejected)
  - [ ] Test concurrent file uploads
  - [ ] Verify vector status updates
- [ ] Test RAG queries
  - [ ] Test basic document queries
  - [ ] Test queries with multiple document context
  - [ ] Test queries with no relevant context
  - [ ] Test rate limiting (10 requests/minute)
  - [ ] Test streaming responses
- [ ] Performance optimization
  - [ ] Monitor and optimize chunk sizes
  - [ ] Analyze and optimize embedding parameters
  - [ ] Implement caching for frequent queries
  - [ ] Optimize vector search parameters
- [ ] Error handling
  - [ ] Test network failures
  - [ ] Test API rate limits
  - [ ] Test invalid file formats
  - [ ] Test quota exceeded scenarios

### 8. Documentation
- [ ] Document RAG architecture and flow
  - [ ] System architecture diagram
  - [ ] Data flow documentation
  - [ ] API endpoints documentation
- [ ] Update API documentation
  - [ ] Document new endpoints
  - [ ] Document request/response formats
  - [ ] Document error codes
- [ ] Add usage examples and limitations
  - [ ] Basic usage examples
  - [ ] Advanced query examples
  - [ ] Known limitations
  - [ ] Best practices
- [ ] Document error codes and troubleshooting
  - [ ] Common error scenarios
  - [ ] Troubleshooting steps
  - [ ] Support contact information

## Technical Implementation Details

### Vector Processing Flow
1. File Upload → Supabase Storage
2. Extract text content
3. Split into chunks (~ 500 tokens each)
4. Generate embeddings using OpenAI
5. Store in Pinecone with metadata
6. Update database status

### RAG Query Flow
1. User sends RAG query
2. Check rate limits (10 requests/minute)
3. Retrieve top 5 relevant chunks from Pinecone
4. Format context with source attribution
5. Generate response with GPT-4 Turbo
6. Stream response to chat interface

### Key Components
- `lib/rag/processor.ts`: File processing and vectorization
- `lib/rag/pinecone-client.ts`: Vector database operations
- `lib/rag/query-service.ts`: RAG query handling
- `components/chat/rag-button.tsx`: RAG-specific UI elements (pending)
- `app/api/rag/`: API routes for RAG operations (pending)

### Security Considerations
- [x] Implement rate limiting for vector operations
- [ ] Add user quotas for RAG queries
- [x] Secure vector storage access
- [x] Sanitize and validate all inputs
- [ ] Monitor API usage and costs 