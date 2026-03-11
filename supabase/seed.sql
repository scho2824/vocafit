-- Insert initial vocabulary words
INSERT INTO public.vocabulary (target_word, definition, part_of_speech, kor_translation, difficulty_level) VALUES
('negotiate', 'To formally discuss something to reach an agreement.', 'verb', '협상하다', 4),
('maintain', 'To make something continue at the same level, standard, or rate.', 'verb', '유지하다', 3),
('predict', 'To say that something will happen in the future.', 'verb', '예측하다', 3),
('fascinating', 'Extremely interesting.', 'adjective', '매력적인', 4),
('colossal', 'Extremely large.', 'adjective', '거대한', 5);

-- Insert contextual examples based on inserted vocabulary
DO $$
DECLARE
    v_negotiate uuid;
    v_maintain uuid;
    v_predict uuid;
    v_fascinating uuid;
    v_colossal uuid;
BEGIN
    SELECT word_id INTO v_negotiate FROM public.vocabulary WHERE target_word = 'negotiate';
    SELECT word_id INTO v_maintain FROM public.vocabulary WHERE target_word = 'maintain';
    SELECT word_id INTO v_predict FROM public.vocabulary WHERE target_word = 'predict';
    SELECT word_id INTO v_fascinating FROM public.vocabulary WHERE target_word = 'fascinating';
    SELECT word_id INTO v_colossal FROM public.vocabulary WHERE target_word = 'colossal';

    INSERT INTO public.contextual_examples (word_id, sentence) VALUES
    (v_negotiate, 'I tried to negotiate the price down for the toy.'),
    (v_maintain, 'It is important to maintain good habits.'),
    (v_predict, 'The weather forecaster can predict if it will rain tomorrow.'),
    (v_fascinating, 'Space travel is a fascinating subject for many kids.'),
    (v_colossal, 'We saw a colossal dinosaur skeleton at the museum.');
END $$;
