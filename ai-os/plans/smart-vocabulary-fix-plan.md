# Smart Vocabulary Bug Fixes: Implementation Plan

## Goal
Address the five security, bug, edge case, and performance issues identified in the Smart Vocabulary QA report (`docs/bug-reports.md`, Section 8) without altering the overall architecture.

## Approach & Root Cause Analysis

### 1. SECURITY HIGH: Prompt Injection Vulnerability
*   **Root Cause:** Direct string interpolation of `target_word` into the prompt (`Target Word: ${target_word}`) allows users to append instructions that bypass the system prompt.
*   **Fix Strategy:** 
    *   Implement input validation on the Edge Function to ensure `target_word` contains only alphabetic characters and spaces, and is of a reasonable length (e.g., max 50 characters).
    *   Use XML delimiters in the user prompt to strictly isolate the input: `<target_word>${target_word}</target_word>`.

### 2. BUG HIGH: Uncancelled SSE Stream on Component Unmount
*   **Root Cause:** The `useVariations` hook uses `fetch` without an `AbortController`. When the component unmounts, the browser continues to download the stream, and the Promise chain tries to call `setVariations` on an unmounted component.
*   **Fix Strategy:** 
    *   Introduce an `AbortController` in the `generateVariations` function inside `useVariations.ts`.
    *   Pass the `signal` to the `fetch` request.
    *   In the component (`SmartVocabUI.tsx`), use a `useEffect` cleanup function to explicitly abort the active request when the component unmounts.

### 3. BUG MEDIUM: TTS Race Condition on Fast Unmount
*   **Root Cause:** The `playAudio` function uses `setTimeout(..., 50)` to bypass a Chrome bug. However, if the component unmounts within those 50ms, the `useEffect` cleanup (`speechSynthesis.cancel()`) runs *first*, and then the timeout executes `speak()`, causing audio to play on the next screen.
*   **Fix Strategy:**
    *   Store the timeout ID in a React `useRef`.
    *   In the component unmount cleanup logic, clear the timeout (`clearTimeout(timeoutRef.current)`) *before* calling `speechSynthesis.cancel()`.

### 4 & 5. EDGE CASE & PERFORMANCE: Progressive JSON Parsing Fragility & Jank
*   **Root Cause:** The hook uses a global regex `accumulatedJson.match(/\{[^{}]*\}/g)` inside a tight loop (every SSE chunk). This fails if a generated English sentence naturally contains `{}` and wastes CPU cycles by repeatedly re-parsing the entire growing string.
*   **Fix Strategy:**
    *   Instead of regex, use a more robust streaming JSON approach or simplify the parsing logic. 
    *   Since OpenAI's `gpt-4o-mini` streams token by token, we can simply split the `accumulatedJson` by `}, {` or track bracket depth if we want true progressive rendering.
    *   **Better Approach for UI:** Wait for the specific `data: [DONE]` signal or end of stream to parse the final JSON array. To maintain the "progressive" feel without regex fragility, we can show a skeleton loader, parse only the final block once it arrives, OR use a lightweight manual bracket-counting parse loop instead of global regex matching.
    *   *Proposed Solution:* Implement a custom bracket-counting algorithm in `useVariations.ts` that safely extracts complete top-level objects one by one as they stream in, avoiding regex entirely and operating in $O(N)$ time.

## Files to Modify

#### [MODIFY] `supabase/functions/generate-variations/index.ts`
*   Add basic regex validation for `target_word`.
*   Wrap input in XML delimiters in the `userPrompt`.

#### [MODIFY] `apps/web/src/hooks/useVariations.ts`
*   Add `AbortController` support to `generateVariations` (return the abort function).
*   Replace the regex JSON parser with a safe, iterative bracket-counting method to extract completed `Variation` objects from the stream.

#### [MODIFY] `apps/web/src/components/features/training/SmartVocabUI.tsx`
*   Add a `useRef` for the TTS `setTimeout`.
*   Update `useEffect` cleanup to call `clearTimeout` and the new `abort()` function from `useVariations`.

## Step-by-Step Plan
1.  **Fix Edge Function Security:** Update `supabase/functions/generate-variations/index.ts` to sanitize and delimit `target_word`.
2.  **Fix Hook Performance & Bugs:** Update `apps/web/src/hooks/useVariations.ts` to include `AbortController` and implement the robust iterative JSON parser.
3.  **Fix UI Edge Cases:** Update `apps/web/src/components/features/training/SmartVocabUI.tsx` to handle aborting the fetch and clearing the TTS timeout on unmount.
4.  **Verification:** Run `npx tsc --noEmit` and review code logic manually.
