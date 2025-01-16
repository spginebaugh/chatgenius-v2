-- Add RAG bot user if it doesn't exist
DO $$
BEGIN
  -- First clean up any existing data in the correct order
  DELETE FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-000000000000';
  DELETE FROM public.users WHERE user_id = '00000000-0000-0000-0000-000000000000';
  DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000';
  
  -- Insert into auth.users first
  INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-000000000000', 'rag_bot@internal.chatgenius');
END $$;

-- Update RAG bot profile
UPDATE public.users 
SET 
  username = 'RAG Bot',
  bio = 'I help you find information in your documents',
  status = 'ONLINE'
WHERE user_id = '00000000-0000-0000-0000-000000000000'; 