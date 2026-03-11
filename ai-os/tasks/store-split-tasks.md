# Actionable Tasks: Store Split Architecture

## 1. Database & Edge Cases
- [x] Create a `get_daily_mission` Postgres RPC function. (Uses `NOT IN` to filter out words already in `user_sessions`).
- [x] Update `app/page.tsx` (Dashboard) to fix the Empty Database Loop: Add strict `dailyMission.length === 0` check and show a fallback message.

## 2. Backend (React Query Hooks)
- [x] Update `useDailyMission.ts` hook to call `.rpc('get_daily_mission')` instead of the direct `.limit(3)` query.

## 3. Frontend (Zustand Store Split)
- [x] Create `useSessionStore.ts`: Migration of `dailyWords`, `currentIndex`, `currentPhase`, `startSession()`, `nextWord()`, and `setPhase()`.
- [x] Create `useSentenceStore.ts`: Migration of highly-volatile input state (`sentenceInput`, `isEvaluating`, `feedback`).
- [x] Delete `useTrainingStore.ts` to enforce the new architectural boundary.

## 4. Frontend (Component Re-Wiring)
- [x] Refactor `TrainingSessionUI.tsx`: Update imports to pull `currentPhase` and `dailyWords` from `useSessionStore`.
- [x] Refactor `SmartVocabUI.tsx`: Update imports to pull `setPhase` from `useSessionStore`.
- [x] Refactor `SentenceBuilderUI.tsx`: Update imports to pull input state from `useSentenceStore` and progression functions (`nextWord`) from `useSessionStore`.
- [x] Refactor `SessionCompleteUI.tsx`: Update imports to pull `dailyWords` from `useSessionStore`.
- [x] Refactor `app/page.tsx` (Dashboard): Update imports to pull `startSession` from `useSessionStore`.
- [x] Refactor `app/training/page.tsx`: Update imports to pull `dailyWords` from `useSessionStore`.

## 5. Tests & Verification
- [x] Run `npx tsc --noEmit` to ensure all component wiring and store exports are perfectly typed.
- [x] Verify Dashboard cleanly fetches only unlearned words (Static Mission Edge Case closed).
- [x] Record React Profiler to guarantee `TrainingSessionUI` does not re-render when typing in the Sentence Builder Phase (Performance Issue closed).
