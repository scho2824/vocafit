# Sentence Builder Trainer Implementation Tasks

## Database & Backend Foundation
- [x] Create `user_sentences` table schema and RLS policies
- [x] Create `evaluate-sentence` Edge Function
- [x] Implement OpenAI prompt engineering for kid-friendly strict JSON evaluation
- [x] Database Logging: Insert sentence attempt from Edge Function

## Frontend State & API
- [x] Update `useTrainingStore.ts` with Sentence Builder states (`inputValue`, `isEvaluating`, etc.)
- [x] Create `useEvaluateSentence.ts` React Query mutation hook

## UI Implementation (Child-Centric)
- [x] Build `SentenceBuilderUI.tsx`
- [x] Implement Target Word & Input Area (Large tap targets, high contrast)
- [x] Implement Feedback States (Loading animation, Success bounce, Retry state)
