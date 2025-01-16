-- Seed initial admin user
insert into auth.users (id, email)
values 
  ('d0fc7e7c-8e3a-4195-84f5-fce375b2a76d', 'admin@example.com');

-- Seed some test users
insert into auth.users (id, email)
values
  ('b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f', 'alice@example.com'),
  ('c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e', 'bob@example.com'),
  ('d7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f', 'charlie@example.com');

-- Update user profiles with additional information
update public.users 
set 
  username = case user_id
    when 'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d' then 'admin'
    when 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f' then 'alice'
    when 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e' then 'bob'
    when 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f' then 'charlie'
  end,
  bio = case user_id
    when 'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d' then 'System Administrator'
    when 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f' then 'Software Engineer'
    when 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e' then 'Product Manager'
    when 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f' then 'UX Designer'
  end,
  profile_picture_url = case user_id
    when 'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d' then 'https://example.com/avatars/admin.jpg'
    when 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f' then 'https://example.com/avatars/alice.jpg'
    when 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e' then 'https://example.com/avatars/bob.jpg'
    when 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f' then 'https://example.com/avatars/charlie.jpg'
  end
where user_id in (
  'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d',
  'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f',
  'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e',
  'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f'
);

-- Seed additional roles (handle_new_user trigger already sets admin for first user)
insert into public.user_roles (user_id, role)
select 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f', 'moderator'
where not exists (
  select 1 from public.user_roles
  where user_id = 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f'
  and role = 'moderator'
);

-- Seed role permissions
insert into public.role_permissions (role, permission)
values
  ('admin', 'channels.delete'),
  ('admin', 'messages.delete'),
  ('moderator', 'messages.delete');

-- Seed channels
insert into public.channels (channel_id, slug, created_by)
values
  (1, 'general', 'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d'),
  (2, 'random', 'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d'),
  (3, 'development', 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f');

-- Reset sequences
select setval('public.channels_channel_id_seq', (select max(channel_id) from public.channels));

-- Seed some channel messages
insert into public.messages (message, message_type, user_id, channel_id)
values
  ('Welcome to the general channel!', 'channel', 'd0fc7e7c-8e3a-4195-84f5-fce375b2a76d', 1),
  ('Hey everyone!', 'channel', 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f', 1),
  ('Anyone up for lunch?', 'channel', 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e', 2),
  ('New project kickoff tomorrow!', 'channel', 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f', 3);

-- Seed some direct messages
insert into public.messages (message, message_type, user_id, receiver_id)
values
  ('Hey Alice, got a minute?', 'direct', 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e', 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f'),
  ('Sure Bob, what''s up?', 'direct', 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f', 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e');

-- Get the IDs of the first messages for threading
do $$
declare
  welcome_message_id bigint;
begin
  select message_id into welcome_message_id from public.messages where message = 'Welcome to the general channel!';

  -- Seed some thread messages
  insert into public.messages (message, message_type, user_id, parent_message_id)
  values
    ('Great to be here!', 'thread', 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e', welcome_message_id),
    ('Looking forward to collaborating!', 'thread', 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f', welcome_message_id);
end $$;

-- Reset message sequence
select setval('public.messages_message_id_seq', (select max(message_id) from public.messages));

-- Seed reactions, mentions, and files
do $$
declare
  welcome_message_id bigint;
  hey_everyone_id bigint;
  lunch_message_id bigint;
  kickoff_message_id bigint;
begin
  select message_id into welcome_message_id from public.messages where message = 'Welcome to the general channel!';
  select message_id into hey_everyone_id from public.messages where message = 'Hey everyone!';
  select message_id into lunch_message_id from public.messages where message = 'Anyone up for lunch?';
  select message_id into kickoff_message_id from public.messages where message = 'New project kickoff tomorrow!';

  -- Seed reactions
  insert into public.message_reactions (message_id, user_id, emoji)
  values
    (welcome_message_id, 'b6088c7c-d8f1-4a1c-8e18-e2e58e3c0a1f', '👋'),
    (welcome_message_id, 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e', '❤️'),
    (hey_everyone_id, 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f', '👍');

  -- Seed mentions
  insert into public.message_mentions (message_id, mentioned_user_id)
  values
    (hey_everyone_id, 'c6d2e939-9d91-4c2b-8f1c-4b2c4e3d5a2e'),
    (lunch_message_id, 'd7e3f040-0e92-5d3c-9f2d-5c3d5b3e6a3f');
end $$;