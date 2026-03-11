# Actionable Tasks: Smart Vocabulary Feature

## Phase 1: Database & Edge Function Integration

- [x] **Check/Create Database Tables:** Verify `vocabulary` and `contextual_examples` tables exist. If not, create migration `[TIMESTAMP]_vocabulary_schema.sql` and insert 3 basic seed words (e.g., maintain, intricate, negotiate) with definitions and baseline examples.
- [x] **Create Edge Function (generate-variations):**
  - [x] Initialize Supabase Edge Function with CORS support.
  - [x] Implement OpenAI API call (`gpt-4o-mini`) requesting 3 kid-friendly example sentences (Lexile 7-12).
  - [x] Implement SSE Streaming (`stream: true`).
  - [x] Add JSON parsing robustness (regex stripping markdown backticks).
  - [x] Add fallback `try/catch` block to return safe default sentences if LLM fully crashes/hallucinates.

## Phase 2: Frontend Data Hooks

- [x] **Create `useVocabularyContent.ts`:** 
  - [x] Build React Query hook to fetch static DB definition and baseline example via `@supabase/supabase-js`.
- [x] **Create `useVariations.ts`:**
  - [x] Build React Query hook/utility to consume the SSE stream from `generate-variations`.
  - [x] Ensure local state progressively updates (Variation 1 -> 2 -> 3) as chunks arrive.

## Phase 3: Frontend UI (`SmartVocabUI.tsx`)

- [x] **Structure & Data:** Replace mock UI. Fetch data via `useVocabularyContent` and `useVariations`. Add error/suspense handling.
- [x] **Top Section (Identity):** Render Target Word, Korean Definition, and a large TTS Audio play button.
- [x] **Middle Section (Baseline):** Render the static example sentence fetched from DB.
- [x] **Bottom Section (Dynamic AI):** 
  - [x] Render a playful "AI is thinking" skeleton loader during the initial fetch.
  - [x] Progressively render each AI variation as it streams in from `useVariations`.
- [x] **TTS Helper (Edge Case Fix):** 
  - [x] Create an explicit TTS helper function (using `window.speechSynthesis`).
  - [x] Ensure it calls `.cancel()` before `.speak()`.
  - [x] Strictly bind audio play to button `onClick` events (No auto-play on mount).
- [x] **Flow Transition:** Wire the bottom "Continue to Sentence Builder" CTA button to trigger `setPhase('sentence_builder')`.

## Phase 4: Verification

- [x] Run `npx tsc --noEmit` to verify strict typing of the new hooks and UI components.
- [x] Manually test TTS audio on desktop browser to ensure no overlap occurs.
- [x] Verify streaming JSON chunks handling works as intended.
