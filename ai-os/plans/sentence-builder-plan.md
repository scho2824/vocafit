# Implementation Plan: Sentence Builder Trainer

## 1. Goal
Implement the **Sentence Builder Trainer**, the core feature of the VocaFit app. This feature must allow a user (child) to view a target vocabulary word, input a sentence using that word (via type or speech), and receive instant, structured AI evaluation based on grammar, naturalness, and target word usage. The implementation must strictly adhere to the "Child-Centric Design Principles" (Simplicity, Positive Feedback Loop, Safety & Focus).

## 2. Approach
The approach leverages a decoupled architecture to separate UI state from AI evaluation logic:
1.  **Frontend (Next.js/React):** Build a highly simplified, distraction-free UI component (`SentenceBuilderUI`). Mange local state (input, loading, feedback) using Zustand.
2.  **API/BaaS (Supabase Edge Function):** Create a secure proxy function (`evaluate-sentence`) that authenticates the request, safely stores OpenAI keys, and enforces a strict structured JSON prompt for the LLM.
3.  **Database (Supabase PostgreSQL):** Define the schema for logging the user's attempts in a `user_sentences` table for progress tracking.
4.  **AI (OpenAI `gpt-4o-mini`):** Engineer a robust system prompt to guarantee consistent grading and encouraging, kid-friendly feedback.

## 3. Files to Modify / Create

### Frontend (`apps/web/*` - Assuming standard Monorepo/Next.js structure)
*   **[NEW]** `src/components/features/training/SentenceBuilderUI.tsx`
    *   *Purpose:* The main UI component handling the target word display, input field, and feedback animation states.
*   **[NEW]** `src/store/useTrainingStore.ts`
    *   *Purpose:* Zustand store to manage active session state (current word, retry count, evaluation results).
*   **[NEW]** `src/hooks/useEvaluateSentence.ts`
    *   *Purpose:* React Query mutation hook to handle the POST request to the Supabase Edge Function and manage loading/error states.

### Backend (`supabase/*`)
*   **[NEW]** `supabase/functions/evaluate-sentence/index.ts`
    *   *Purpose:* Deno Edge Function. Handles JWT auth, OpenAI API call, and JSON parsing.
*   **[MODIFY]** `supabase/migrations/[timestamp]_init_schema.sql` (or similar)
    *   *Purpose:* Add the `user_sentences` table definition and Row Level Security (RLS) policies.

---

## 4. Step-by-Step Tasks

### Phase 1: Database & Backend Foundation
1.  **Define Schema:** Create SQL migration creating the `user_sentences` table storing `id`, `user_id`, `target_word`, `submitted_sentence`, `is_correct` (boolean), `score` (int), and `feedback_json` (jsonb).
2.  **Edge Function Setup:** Scaffold the `evaluate-sentence` Deno function.
3.  **Prompt Engineering (Critical):** Implement the OpenAI call within the Edge Function.
    *   *Task:* Write a system prompt that forces `gpt-4o-mini` to evaluate the sentence and return a strict JSON payload matching this interface:
        ```typescript
        interface AIFeedback {
          success: boolean; // True if grammar is good and word is used
          score: number; // 0-100
          message: string; // Encouraging kid-friendly message
          suggestion: string | null; // How to improve or a more natural alternative
        }
        ```
4.  **Database Logging:** Ensure the Edge Function writes the user's attempt to the `user_sentences` table *before* returning the JSON to the client.

### Phase 2: Frontend State & API Integration
1.  **Zustand Store:** Create `useTrainingStore` to manage `status` ('idle' | 'recording' | 'evaluating' | 'feedback'), `currentFeedback`, and `inputValue`.
2.  **Data Fetching Hook:** Implement `useEvaluateSentence.ts` utilizing `@tanstack/react-query` to call the Supabase Edge Function securely, handling token injection.

### Phase 3: UI Implementation (Child-Centric Design)
1.  **Component Scaffolding:** Build `SentenceBuilderUI.tsx`.
    *   Apply "Large Tap Targets" rule (min `p-4`, `h-14` for buttons/inputs).
    *   Apply "High Contrast" rules (deep blacks/blues for text, bright encouraging colors for success states).
2.  **Interaction Flow:**
    *   Display Target Word prominently (`h1` equivalent).
    *   Input area (Text area).
    *   "Submit" button.
3.  **Feedback States:**
    *   Implement "AI is thinking..." visual state (critical for mitigating latency).
    *   Implement Success/Retry states based on the Edge Function JSON response. Use `framer-motion` for subtle celebratory bounces on success.



---

## 5. Code Snippets (Examples)

**Edge Function Prompt Structure (Deno/Typescript):**
```typescript
const systemPrompt = `
You are a friendly, encouraging English teacher for a 7-12 year old Korean child.
Evaluate the user's sentence based on the target word: "${targetWord}".
Rules:
1. Is the grammar basically correct? Minor mistakes are okay if the meaning is clear.
2. Did they use the target word appropriately?
3. Output MUST be valid JSON, nothing else.

Format:
{
  "success": boolean,
  "score": number (0-100),
  "message": "Kid-friendly encouraging feedback (keep it short!)",
  "suggestion": "A slightly more natural way to say it, if applicable, otherwise null"
}
`;
```

---

## 6. Tradeoffs
*   **Edge Functions vs. Direct Client OpenAI Calls:**
    *   *Tradeoff:* Adding an Edge Function introduces slight network overhead compared to calling OpenAI directly from the browser.
    *   *Decision:* **Required.** Client-side OpenAI calls expose secret API keys, which is a massive security risk. The Edge Function proxy is mandatory for production.

## 7. Risks
1.  **JSON Parsing Failures:** The LLM might occasionally return malformed JSON or wrap it in markdown blockticks (`` `json ... ` ``), causing the frontend to crash.
    *   *Mitigation:* Use OpenAI's `response_format: { type: "json_object" }` flag. Always wrap the Edge Function parser in a `try/catch` and provide a fallback "Oops, let's try again!" UI state.
2.  **Latency:** OpenAI API calls taking >3 seconds, causing the child to lose focus or mash buttons.
    *   *Mitigation:* Disable the submit button immediately upon click. Display a highly engaging, non-blocking loading animation.
3.  **Complex UI Creep:** Developers adding tooltips, complex dictionary popups, or multi-step confirmation modals.
    *   *Mitigation:* Strictly enforce the "One Action Per Screen" rule through code review against this plan.
