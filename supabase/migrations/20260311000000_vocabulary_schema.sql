-- Create Vocabulary Table
CREATE TABLE IF NOT EXISTS public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_word TEXT NOT NULL UNIQUE,
    english_definition TEXT NOT NULL,
    korean_definition TEXT NOT NULL,
    part_of_speech TEXT NOT NULL,
    difficulty_level TEXT DEFAULT 'beginner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Contextual Examples Table (Baseline Example)
CREATE TABLE IF NOT EXISTS public.contextual_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    example_sentence TEXT NOT NULL,
    korean_translation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contextual_examples ENABLE ROW LEVEL SECURITY;

-- Create Policies (Read-only for authenticated users)
CREATE POLICY "Allow read access to authenticated users on vocabulary" 
ON public.vocabulary FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow read access to authenticated users on contextual_examples" 
ON public.contextual_examples FOR SELECT 
TO authenticated 
USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_target_word ON public.vocabulary(target_word);
CREATE INDEX IF NOT EXISTS idx_contextual_examples_word_id ON public.contextual_examples(word_id);

-- Seed Initial Data
DO $$
DECLARE
    word1_id UUID := gen_random_uuid();
    word2_id UUID := gen_random_uuid();
    word3_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.vocabulary (id, target_word, english_definition, korean_definition, part_of_speech) VALUES
        (word1_id, 'maintain', 'to cause or enable a condition or state of affairs to continue', '유지하다', 'verb'),
        (word2_id, 'intricate', 'very complicated or detailed', '복잡한', 'adjective'),
        (word3_id, 'negotiate', 'to try to reach an agreement or compromise by discussion with others', '협상하다', 'verb');

    INSERT INTO public.contextual_examples (word_id, example_sentence, korean_translation) VALUES
        (word1_id, 'It is important to maintain good habits.', '좋은 습관을 유지하는 것은 중요합니다.'),
        (word2_id, 'The intricate puzzle took days to solve.', '그 복잡한 퍼즐은 푸는 데 며칠이 걸렸습니다.'),
        (word3_id, 'She managed to negotiate a better price.', '그녀는 더 나은 가격으로 협상하는 데 성공했습니다.');
END $$;
