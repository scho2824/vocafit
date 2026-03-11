-- Create user_sessions table for tracking daily streaks and completions
create table if not exists public.user_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    completed_words text[] not null default '{}',
    completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.user_sessions enable row level security;

-- Policies for user_sessions
create policy "Users can insert their own sessions" 
on public.user_sessions 
for insert 
with check (auth.uid() = user_id);

create policy "Users can read their own sessions" 
on public.user_sessions 
for select 
using (auth.uid() = user_id);

-- Ensure vocabulary is readable by all authenticated users
-- (This might already exist from 20260308000000_init_vocabulary.sql, but we ensure it here)
drop policy if exists "Enable read access for authenticated users" on public.vocabulary;
create policy "Enable read access for authenticated users" 
on public.vocabulary 
for select 
to authenticated 
using (true);

-- Indexes
create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
