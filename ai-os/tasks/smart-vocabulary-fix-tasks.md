# Smart Vocabulary Bug Fixes: Actionable Tasks

## Phase 1: Edge Function Security Fix
- [x] **Prompt Sanitize & Delimit:** In `supabase/functions/generate-variations/index.ts`, add regex check for `target_word` (alphabetic + spaces only, max 50 chars). Error out early if invalid.
- [x] **XML Delimiters:** Wrap the user input in `<target_word>` tags in the prompt to prevent injection.

## Phase 2: Frontend Data Hooks Fixes
- [x] **Abort Controller Setup:** In `apps/web/src/hooks/useVariations.ts`, create an `AbortController` inside `generateVariations`.
- [x] **Pass Signal:** Pass the `signal` to the Supabase `fetch` POST request.
- [x] **Robust JSON Parsing:** Remove the global regex matching step. Instead, implement a custom bracket counting logic string walker to identify and parse completed objects from the SSE stream chunk by chunk. Error-handle safely.
- [x] **Abort Handling:** Handle `err.name === 'AbortError'` cleanly without showing red errors or triggering the fallback. Return the abort function from the hook.

## Phase 3: Frontend UI Edge Case Fixes
- [x] **TTS Race Condition:** In `apps/web/src/components/features/training/SmartVocabUI.tsx`, store `setTimeout` ID in a `useRef`.
- [x] **Component Unmount Cleanup:** Update the `useEffect` cleanup block:
  - Call the generated `abort()` function from `useVariations` if loading.
  - Call `clearTimeout` on the ref.
  - Call `window.speechSynthesis.cancel()`.
- [x] **Progressive Stream Edge Case:** Verify that the "AI Context Explorer" skeleton loader gracefully transitions to actual data blocks as the custom bracket parser returns completed arrays.

## Phase 4: Compile & Verification
- [x] Run `npx tsc --noEmit`
- [x] Review implementation logically for memory leaks and race conditions.
