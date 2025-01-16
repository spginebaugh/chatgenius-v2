-- Create enums
create type public.app_permission as enum ('channels.delete', 'messages.delete');
create type public.app_role as enum ('admin', 'moderator');
create type public.user_status as enum ('ONLINE', 'OFFLINE');
create type public.message_type as enum ('channel', 'direct', 'thread');
create type public.file_type as enum ('image', 'video', 'audio', 'document');

-- Create base tables
create table public.users (
  user_id uuid not null primary key,
  username text,
  bio text,
  profile_picture_url text,
  last_active_at timestamp with time zone default timezone('utc'::text, now()),
  status user_status default 'OFFLINE'::public.user_status,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.users is 'Profile data for each user.';
comment on column public.users.user_id is 'References the internal Supabase Auth user.';

create table public.channels (
  channel_id bigint generated by default as identity primary key,
  slug text unique not null,
  created_by uuid references public.users(user_id) not null,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.channels is 'Topics and groups.';

-- Unified Messages Table
create table public.messages (
  message_id bigint generated by default as identity primary key,
  message text,
  message_type message_type not null,
  user_id uuid references public.users(user_id) not null,
  channel_id bigint references public.channels(channel_id),
  receiver_id uuid references public.users(user_id),
  parent_message_id bigint references public.messages(message_id),
  thread_count integer default 0,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure channel messages have channel_id
  constraint channel_messages_require_channel check (
    message_type != 'channel' or channel_id is not null
  ),
  -- Ensure direct messages have receiver_id
  constraint direct_messages_require_receiver check (
    message_type != 'direct' or receiver_id is not null
  ),
  -- Ensure thread messages have parent_message_id
  constraint thread_messages_require_parent check (
    message_type != 'thread' or parent_message_id is not null
  )
);
comment on table public.messages is 'Unified messages table for channels, direct messages, and threads.';

-- Message Files
create table public.message_files (
  file_id bigint generated by default as identity primary key,
  message_id bigint references public.messages(message_id) on delete cascade not null,
  file_type file_type not null,
  file_url text not null,
  vector_status text default 'pending' check (vector_status in ('pending', 'processing', 'completed', 'failed')),
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.message_files is 'Files attached to messages.';

-- Message Mentions
create table public.message_mentions (
  mention_id bigint generated by default as identity primary key,
  message_id bigint references public.messages(message_id) on delete cascade not null,
  mentioned_user_id uuid references public.users(user_id) not null,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, mentioned_user_id)
);
comment on table public.message_mentions is 'User mentions in messages.';

-- Message Reactions
create table public.message_reactions (
  reaction_id bigint generated by default as identity primary key,
  message_id bigint references public.messages(message_id) on delete cascade not null,
  user_id uuid references public.users(user_id) not null,
  emoji text not null,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id, emoji)
);
comment on table public.message_reactions is 'Emoji reactions on messages.';

-- Roles and Permissions
create table public.user_roles (
  role_id bigint generated by default as identity primary key,
  user_id uuid references public.users(user_id) not null,
  role app_role not null,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);
comment on table public.user_roles is 'User role assignments.';

create table public.role_permissions (
  permission_id bigint generated by default as identity primary key,
  role app_role not null,
  permission app_permission not null,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (role, permission)
);
comment on table public.role_permissions is 'Role permission assignments.';

-- Indexes for performance
create index messages_user_id_idx on public.messages using btree (user_id);
create index messages_channel_id_idx on public.messages using btree (channel_id);
create index messages_receiver_id_idx on public.messages using btree (receiver_id);
create index messages_parent_message_id_idx on public.messages using btree (parent_message_id);
create index message_reactions_message_id_idx on public.message_reactions using btree (message_id);
create index message_reactions_user_id_idx on public.message_reactions using btree (user_id);
create index message_mentions_message_id_idx on public.message_mentions using btree (message_id);
create index message_mentions_mentioned_user_id_idx on public.message_mentions using btree (mentioned_user_id);
create index message_files_message_id_idx on public.message_files using btree (message_id);

-- Helper Functions
create or replace function public.authorize(
  required_permission app_permission,
  user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on ur.role = rp.role
    where ur.user_id = authorize.user_id
    and rp.permission = authorize.required_permission
  );
$$;

-- Handle new user registration
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (user_id, username)
  values (new.id, new.email);

  -- First user gets admin role
  if (select count(*) = 1 from auth.users) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  end if;

  -- Handle special email addresses
  if position('+supaadmin@' in new.email) > 0 then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  elsif position('+supamod@' in new.email) > 0 then
    insert into public.user_roles (user_id, role)
    values (new.id, 'moderator');
  end if;

  return new;
end;
$$;

-- Trigger for new user registration
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to validate thread parent
create or replace function public.validate_thread_parent()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only check for thread messages
  if new.message_type = 'thread' then
    -- Check if parent exists and is not a thread
    if exists (
      select 1 from public.messages
      where message_id = new.parent_message_id
      and message_type = 'thread'
    ) then
      raise exception 'Thread messages cannot be created as replies to other thread messages';
    end if;
  end if;
  return new;
end;
$$;

-- Trigger to prevent threads of threads
create trigger validate_thread_parent_trigger
  before insert or update on public.messages
  for each row execute function public.validate_thread_parent();

-- Function to update thread count
create or replace function public.update_thread_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT' and new.message_type = 'thread') then
    update public.messages
    set thread_count = thread_count + 1
    where message_id = new.parent_message_id;
  elsif (tg_op = 'DELETE' and old.message_type = 'thread') then
    update public.messages
    set thread_count = thread_count - 1
    where message_id = old.parent_message_id;
  end if;
  return null;
end;
$$;

-- Trigger to maintain thread count
create trigger update_thread_count_trigger
  after insert or delete on public.messages
  for each row execute function public.update_thread_count();

-- Function to toggle emoji reactions
create or replace function public.toggle_reaction(
  p_message_id bigint,
  p_emoji text,
  p_user_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  -- Delete reaction if it exists
  if exists (
    select 1 from public.message_reactions
    where message_id = p_message_id
    and user_id = p_user_id
    and emoji = p_emoji
  ) then
    delete from public.message_reactions
    where message_id = p_message_id
    and user_id = p_user_id
    and emoji = p_emoji;
  else
    -- Add reaction if it doesn't exist
    insert into public.message_reactions (message_id, user_id, emoji)
    values (p_message_id, p_user_id, p_emoji);
  end if;
end;
$$;

-- Enable Row Level Security
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_mentions enable row level security;
alter table public.message_files enable row level security;
alter table public.users enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can read messages in channels they have access to" on public.messages;
drop policy if exists "Users can insert messages" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;
drop policy if exists "Users can delete their own messages" on public.messages;
drop policy if exists "Users can read messages" on public.messages;
drop policy if exists "Users can read public user data" on public.users;
drop policy if exists "Users can update their own status" on public.users;

-- Create improved policies for messages table with optimized permission checks
create policy "Users can insert messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    -- For channel messages
    (message_type = 'channel' AND channel_id is not null) OR
    -- For direct messages
    (message_type = 'direct' AND receiver_id is not null) OR
    -- For thread messages, simplified check to avoid recursion
    (message_type = 'thread' AND parent_message_id is not null)
  )
);

create policy "Users can read messages"
ON messages FOR SELECT
TO authenticated
USING (
  -- Users can read their own messages
  user_id = auth.uid()
  -- Users can read messages in channels
  OR (message_type = 'channel' AND channel_id is not null)
  -- Users can read direct messages they're part of
  OR (message_type = 'direct' AND (
    auth.uid() = user_id OR 
    auth.uid() = receiver_id
  ))
  -- For thread messages, simplified check to avoid recursion
  OR (message_type = 'thread' AND parent_message_id is not null)
);

create policy "Users can update their own messages"
  on public.messages for update
  using (auth.uid() = user_id);

create policy "Users can delete their own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

-- Create policies for users table
create policy "Users can read public user data"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can update their own status"
  on public.users for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create policies for message reactions
create policy "Users can read message reactions"
  on public.message_reactions for select
  to authenticated
  using (true);

create policy "Users can add reactions"
  on public.message_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own reactions"
  on public.message_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create policies for message_files
create policy "Users can read message files"
  on public.message_files for select
  to authenticated
  using (true);

create policy "Users can insert message files"
  on public.message_files for insert
  to authenticated
  with check (exists (
    select 1 from public.messages
    where message_id = message_id
    and user_id = auth.uid()
  ));

create policy "Users can update their own message files"
  on public.message_files for update
  to authenticated
  using (exists (
    select 1 from public.messages
    where message_id = message_id
    and user_id = auth.uid()
  ));

create policy "Users can delete their own message files"
  on public.message_files for delete
  to authenticated
  using (exists (
    select 1 from public.messages
    where message_id = message_id
    and user_id = auth.uid()
  ));

-- Drop existing realtime configuration
drop publication if exists supabase_realtime;

-- Create vectors table
create table vectors (
    embedding_id uuid primary key default uuid_generate_v4(),
    file_id bigint references message_files(file_id) on delete cascade,
    chunk_index integer not null,
    vector_id text not null,
    chunk_text text not null,
    created_at timestamp with time zone default now(),
    -- Add indexes for common queries
    unique(file_id, chunk_index),
    unique(vector_id)
);

-- Add function to cleanup vectors when message_files are deleted
create or replace function public.handle_deleted_message_file()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Vectors are automatically deleted via cascade
    return old;
end;
$$;

-- Add trigger for message_files deletion
drop trigger if exists on_message_file_deleted on message_files;
create trigger on_message_file_deleted
    after delete on message_files
    for each row
    execute function handle_deleted_message_file();

-- Create new realtime publication with all tables except role_permissions, user_roles, and channels
create publication supabase_realtime for table 
  public.messages,
  public.message_reactions,
  public.message_mentions,
  public.message_files,
  public.users;