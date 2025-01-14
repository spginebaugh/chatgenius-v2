-- Create chat-attachments bucket if it doesn't exist
insert into storage.buckets (id, name)
select 'chat-attachments', 'chat-attachments'
where not exists (
  select 1 from storage.buckets where id = 'chat-attachments'
);

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow public select access to chat-attachments" on storage.objects;
drop policy if exists "Allow public insert access to chat-attachments" on storage.objects;
drop policy if exists "Allow public update access to chat-attachments" on storage.objects;
drop policy if exists "Allow public delete access to chat-attachments" on storage.objects;

-- Create policies for chat-attachments bucket
create policy "Allow public select access to chat-attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat-attachments');

create policy "Allow public insert access to chat-attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-attachments');

create policy "Allow public update access to chat-attachments"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'chat-attachments');

create policy "Allow public delete access to chat-attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-attachments'); 