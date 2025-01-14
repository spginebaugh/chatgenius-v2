-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add RAG message type to the enum
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'rag'; 