# Smart Vocabulary Implementation Plan

## Goal
To implement the "Smart Vocabulary" viewing phase, enabling children to learn a target word's definition, hear its pronunciation, read a baseline example, and explore 3 AI-generated contextual variations before progressing to the Sentence Builder phase.

## Approach
1.  **Backend (Database & Edge):** Create/Verify the database tables for static vocabulary definitions and examples. Create a new Supabase Edge Function to safely query OpenAI for JSON-structured dynamic variations.
2.  **Frontend (Hooks):** Implement React Query hooks (`useVocabularyContent`, `useVariations`) to fetch the hybrid data (static DB + dynamic AI).
3.  **Frontend (UI):** Completely rewrite the mocked `SmartVocabUI.tsx` to handle the multi-step fetching, TTS audio synthesis, and child-centric visual presentation.

## Files to Modify / New Files

### Database & Backend
*   **NEW:** `supabase/migrations/[TIMESTAMP]_vocabulary_schema.sql` (If `vocabulary` and `contextual_examples` tables/dummy data are missing).
*   **NEW:** `supabase/functions/generate-variations/index.ts` (Edge function to call OpenAI).

### Frontend
*   **NEW:** `apps/web/src/hooks/useVocabularyContent.ts` (Fetches static DB definition/example).
*   **NEW:** `apps/web/src/hooks/useVariations.ts` (Fetches AI variations from Edge Function).
*   **MODIFY:** `apps/web/src/components/features/training/SmartVocabUI.tsx` (Replace the mock with the full implementation).

## Step-by-Step Plan

### Phase 1: Database & Backend Preparation
1.  **Migration Check/Create:** Ensure `vocabulary` (id, target_word, meaning) and `contextual_examples` (id, word_id, sentence, translation) exist. Seed 3 basic words if the database is empty.
2.  **Edge Function:** Create `generate-variations`. 
    *   Setup CORS.
    *   Initialize OpenAI client (`gpt-4o-mini`).
    *   Implement strict system prompt for a 7-12 year old Lexile level, requesting a JSON array of `{ sentence, translation }`.
    *   **💡 Latency & UX Mitigation:** Implement Server-Sent Events (SSE) streaming (`stream: true` in OpenAI). The UI must receive and parse chunks to display sentences one by one as they generate, rather than waiting 3-5 seconds for the entire array to finish.
    *   **💡 Hallucination / JSON Parse Mitigation:** Use regex to strip formatting (e.g., ```json ... ```) and handle incomplete JSON chunks robustly during streaming. Implement a `try/catch` block that falls back to a hardcoded "safe" variation if the LLM completely fails the schema, ensuring the UI never crashes.

### Phase 2: React Query Hooks
1.  **`useVocabularyContent`:** Create a hook using `@supabase/supabase-js` to select the word's meaning and baseline `contextual_examples`.
2.  **`useVariations`:** Create a hook to invoke the `generate-variations` Edge Function, passing the given `target_word`.

### Phase 3: UI Implementation (`SmartVocabUI.tsx`)
1.  **Data Wiring:** Import `wordId` from props. Fetch `useVocabularyContent` (Suspense/Load state) and `useVariations`.
2.  **Word Header:** Build the top section displaying the word and meaning.
3.  **TTS Helper:** Implement a local helper for `window.speechSynthesis.speak()`, ensuring `.cancel()` is called first to prevent overlaps.
    *   **💡 Mobile TTS Policy Mitigation:** Ensure the TTS helper is *strictly* bound to the `onClick` handler of the TTS button. Do not attempt to auto-play audio on mount, as iOS Safari will block it and potentially suspend the `SpeechSynthesis` API context for the entire session.
4.  **Baseline Example:** Render the static example fetched from the DB immediately.
5.  **Dynamic AI Section:** Render a playful skeleton loader while `useVariations` is fetching. 
    *   **💡 Streaming Render Mitigation:** Do not wait for the entire response. As the SSE stream chunks arrive from the Edge Function, update the local state to progressively render Variation 1, then Variation 2, then Variation 3, providing immediate visual feedback to the child. Once a sentence is fully streamed, render its TTS button.
6.  **Transition:** Keep the "Continue to Sentence Builder" CTA, but visually place it at the bottom of the content flow.

## Tradeoffs & Risks

*   **Tradeoff (Latency vs. Freshness):** Generating variations on the fly via OpenAI introduces 1-3 seconds of latency. We accept this tradeoff because pre-generating infinite permutations in the database is impossible and removes the dynamic, personalized nature of the instruction. *Mitigation: SSE Streaming (as noted above) + Non-blocking UI design (static content renders instantly).*
*   **Risk (OpenAI JSON Failure):** The LLM might return surrounding markdown text instead of pure JSON, causing `JSON.parse` to crash. *Mitigation: Instruct the model to strictly output valid JSON, strip markdown backticks, and handle streaming JSON robustly (as noted above).*
*   **Risk (TTS Support):** `window.speechSynthesis` behaves differently across Chrome, Safari iOS, and Android webviews (e.g., stopping prematurely). *Mitigation: Strict adherence to user-gesture (click) initiation and acknowledging that edge cases may require a future fallback to a real cloud TTS service.*
