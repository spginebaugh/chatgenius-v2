-- Reset tables
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE auth.users CASCADE;

-- Create test users in auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  aud,
  role
) VALUES
  (
    'd0d54e51-06b2-4570-8f38-67d0e9c0f718',
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email"}',
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ),
  (
    'c9c9e15e-df4a-4e61-aca7-d93a3c0a1d31',
    'mod@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email"}',
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ),
  (
    'e19c50e6-2f70-4d2a-b205-697e5e3507ee',
    'user1@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email"}',
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  ),
  (
    '8f9c61e3-69e4-4359-9eef-84c4f6800525',
    'user2@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email"}',
    '{"provider":"email","providers":["email"]}',
    'authenticated',
    'authenticated'
  );



-- Reset sequences
SELECT setval('public.channels_channel_id_seq', (SELECT MAX(channel_id) FROM public.channels));
SELECT setval('public.channel_messages_message_id_seq', (SELECT MAX(message_id) FROM public.channel_messages));
SELECT setval('public.direct_messages_message_id_seq', (SELECT MAX(message_id) FROM public.direct_messages));
SELECT setval('public.thread_messages_message_id_seq', (SELECT MAX(message_id) FROM public.thread_messages));
-- Create channels
INSERT INTO public.channels (channel_id, slug, created_by)
VALUES
  (1, 'general', 'd0d54e51-06b2-4570-8f38-67d0e9c0f718'),
  (2, 'random', 'd0d54e51-06b2-4570-8f38-67d0e9c0f718'),
  (3, 'help', 'c9c9e15e-df4a-4e61-aca7-d93a3c0a1d31');

-- Add some channel messages
INSERT INTO public.channel_messages (message_id, message, channel_id, user_id)
VALUES
  (1, 'Welcome to the general channel! 👋', 1, 'd0d54e51-06b2-4570-8f38-67d0e9c0f718'),
  (2, 'Thanks! Happy to be here', 1, 'e19c50e6-2f70-4d2a-b205-697e5e3507ee'),
  (3, 'Hello everyone!', 1, '8f9c61e3-69e4-4359-9eef-84c4f6800525');

-- Add some direct messages
INSERT INTO public.direct_messages (message_id, message, sender_id, receiver_id)
VALUES
  (1, 'Hey Alice, how are you?', '8f9c61e3-69e4-4359-9eef-84c4f6800525', 'e19c50e6-2f70-4d2a-b205-697e5e3507ee'),
  (2, 'Hi Bob! I''m good, thanks for asking!', 'e19c50e6-2f70-4d2a-b205-697e5e3507ee', '8f9c61e3-69e4-4359-9eef-84c4f6800525');

-- Add some thread messages
INSERT INTO public.thread_messages (message_id, message, user_id, parent_id, parent_type)
VALUES
  (1, 'Great to see you all!', 'c9c9e15e-df4a-4e61-aca7-d93a3c0a1d31', 1, 'channel_message'),
  (2, 'Thanks mod!', 'e19c50e6-2f70-4d2a-b205-697e5e3507ee', 1, 'channel_message');

-- Add some emoji reactions
INSERT INTO public.emoji_reactions (user_id, parent_id, parent_type, emoji)
VALUES
  ('e19c50e6-2f70-4d2a-b205-697e5e3507ee', 1, 'channel_message', '👋'),
  ('8f9c61e3-69e4-4359-9eef-84c4f6800525', 1, 'channel_message', '❤️');

-- Add some message mentions
INSERT INTO public.message_mentions (parent_id, parent_type, mentioned_user_id)
VALUES
  (2, 'channel_message', 'd0d54e51-06b2-4570-8f38-67d0e9c0f718'),
  (1, 'direct_message', 'e19c50e6-2f70-4d2a-b205-697e5e3507ee');

-- Add role permissions
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('admin', 'channels.delete'),
  ('admin', 'messages.delete'),
  ('moderator', 'messages.delete');

-- Reset sequences
SELECT setval('public.channels_channel_id_seq', (SELECT MAX(channel_id) FROM public.channels));
SELECT setval('public.channel_messages_message_id_seq', (SELECT MAX(message_id) FROM public.channel_messages));
SELECT setval('public.direct_messages_message_id_seq', (SELECT MAX(message_id) FROM public.direct_messages));
SELECT setval('public.thread_messages_message_id_seq', (SELECT MAX(message_id) FROM public.thread_messages));