# Research: Smart Vocabulary System

## 1. Current Codebase State (As-Is)

### 1.1. Missing/Mocked Components
*   **`SmartVocabUI.tsx`:** Currently exists merely as a routing placeholder. It contains no state, no data fetching, and simply renders a "Continue to Sentence Builder" button that triggers `setPhase('sentence_builder')`.
*   **Edge Functions:** There is no `generate-variations` function in the `supabase/functions` directory. All generative AI is currently missing for this phase.
*   **Data Fetching Hooks:** The `useDailyMission.ts` hook successfully retrieves `{ id, word }` combinations via the `get_daily_mission` RPC. However, there are no hooks (e.g., `useVocabulary.ts`, `useVariations.ts`) to fetch the word's definition, translation, default example sentence, or AI-generated variations.

### 1.2. Database Dependencies
Based on the `useDailyMission` return type (`id`, `target_word`), the database has an underlying structure for vocabulary. To fully support the Smart Vocab phase, the schema must support (or be expanded to support):
*   **`vocabulary` table:** Needs `id`, `target_word`, `korean_definition`, `english_definition`, `part_of_speech`.
*   **`contextual_examples` table:** Needs `id`, `word_id`, `example_sentence`, `korean_translation`.

## 2. Core Philosophy & Business Rules
*   **Active Production:** The Smart Vocab phase should prepare the child for the Sentence Builder. It must not feel like a static dictionary.
*   **Kid-Friendly (Ages 7-12):** Definitions and examples must use Lexile-appropriate language. Visually, the UI must use large tap targets, clear typography, and avoid dense text blocks.
*   **TTS Audio:** Every English word and sentence must have a playable native browser TTS button to reinforce pronunciation.
*   **Dynamic Context (AI Variations):** To prevent rote memorization, children must see the word used in 3 *new, dynamically generated* scenarios each time they learn it.

## 3. Architecture Design (To-Be)

### 3.1. Supabase Edge Function: `generate-variations`
*   **Role:** Acts as a secure proxy to OpenAI (`gpt-4o-mini`).
*   **Input:** `target_word`, `difficulty_level` (default "beginner/child").
*   **Processing:** Uses a strict system prompt enforcing a JSON schema for 3 example sentences.
*   **Output:** `[{ "sentence": "...", "translation": "..." }, ...]` array.

### 3.2. Frontend Data Fetching (React Query)
*   **`useVocabularyContent(wordId)`:** Fetches the static definition and baseline example from the Postgres database. This should be extremely fast (cached).
*   **`useVariations(word)`:** Hits the `generate-variations` Edge Function. Since this relies on OpenAI, it has a high risk of latency (1-3s).

### 3.3. Frontend UI (`SmartVocabUI.tsx`)
*   **Top Section (Word Identity):** Large display of the target word, its Korean meaning, and a giant "Play Audio" button. (Powered by `useVocabularyContent`).
*   **Middle Section (Baseline Example):** 1 static, perfectly curated example sentence from the database to guarantee at least one safe, high-quality context immediately on load.
*   **Bottom Section (AI Variations):** 
    *   *Loading State:* Displays a fun "AI is thinking of examples..." skeleton while `useVariations` fetches.
    *   *Resolved State:* Displays the 3 dynamic examples. Each must have its own "Play Audio" button.
*   **Action:** A large "I Got It! Next" button to fire `setPhase('sentence_builder')`.

## 4. Identified Risks & Mitigation Strategies
1.  **AI Latency:** OpenAI can be slow. 
    *   *Mitigation:* We must render the Top and Middle sections immediately using the fast DB response. The Bottom (AI) section will show a distinct, playful loading skeleton so the user is not blocked from starting to learn the core definition.
2.  **Audio Overlap:** Triggering multiple TTS buttons might cause overlapping speech.
    *   *Mitigation:* Implement `window.speechSynthesis.cancel()` before firing any new `SpeechSynthesisUtterance`.
3.  **Prompt Injection / Hallucination:** The AI might return malformed JSON or overly complex sentences.
    *   *Mitigation:* The Edge Function must strictly enforce JSON mode via the OpenAI API and catch/fallback to static examples if parsing fails.
