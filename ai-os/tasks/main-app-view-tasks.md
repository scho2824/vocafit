# Actionable Tasks: Main App View Integration (V2 - State Split Architecture)

## Database
- [x] Check and ensure `vocabulary` table RLS allows `SELECT` for authenticated users.
- [x] Create a `log_session_safe` Postgres function.
- [ ] Create a `get_daily_mission` Postgres function that uses `NOT IN` to filter out words already in `user_sessions`.

## Backend (React Query Hooks)
- [x] Create `useLogSession.ts` hook.
- [ ] Update `useDailyMission.ts` hook to call the new `.rpc('get_daily_mission')` endpoint.

## Frontend (State splitting)
- [ ] Create `useSessionStore.ts`: Move `dailyWords`, `currentIndex`, `currentPhase`, and `nextWord`/`startSession` logic here.
- [ ] Create `useSentenceStore.ts`: Move `sentenceInput`, `isEvaluating`, and `feedback` here.
- [ ] Delete `useTrainingStore.ts`.

## Frontend (Component Re-Wiring & Edge Cases)
- [ ] Update `app/page.tsx` (Dashboard): Add strict `dailyMission.length === 0` check to fix the infinite redirect loop.
- [ ] Update `SmartVocabUI.tsx`: Import `setPhase` from `useSessionStore`.
- [ ] Update `SentenceBuilderUI.tsx`: Import `sentenceInput`/`setFeedback` from `useSentenceStore` and `nextWord` from `useSessionStore`.
- [ ] Update `SessionCompleteUI.tsx`: Import `dailyWords` from `useSessionStore`.
- [ ] Update `TrainingSessionUI.tsx`: Import `currentPhase` and `dailyWords` from `useSessionStore`. (This inherently fixes the Re-Render cascade since it no longer watches the input text).

## Tests
- [ ] Verify Dashboard cleanly fetches only *unlearned* words.
- [ ] Verify Dashboard shows realistic fallback UI when all words are learned.
- [ ] Record React Profiler to guarantee `TrainingSessionUI` does not re-render when typing in the Sentence Builder Phase.
- [ ] Run `npx tsc --noEmit`.
