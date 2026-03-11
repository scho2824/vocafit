-- Create user_sentences table for Sentence Builder Trainer logs
create table if not exists public.user_sentences (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    target_word text not null,
    submitted_sentence text not null,
    is_correct boolean not null,
    score smallint not null,
    feedback_json jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.user_sentences enable row level security;

-- Policies
create policy "Users can insert their own sentences" 
on public.user_sentences 
for insert 
with check (auth.uid() = user_id);

create policy "Users can read their own sentences" 
on public.user_sentences 
for select 
using (auth.uid() = user_id);

-- Indexes
create index if not exists user_sentences_user_id_idx on public.user_sentences(user_id);
create index if not exists user_sentences_target_word_idx on public.user_sentences(target_word);
