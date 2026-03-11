# Implementation Plan: Main App View Integration

## 1. Goal
Integrate the isolated `SmartVocabUI` and `SentenceBuilderUI` components into a unified, seamless "Daily Training Session" experience for children. This involves creating a simplified Dashboard `/`, a locked-down session orthcastrator `/training`, and updating the global store to handle multi-word progression.

## 2. Approach
*   **State Split Architecture:** To resolve the performance issue where typing a single character causes the master `TrainingSessionUI` orchestrator to re-render, we will split the state into two focused domains:
    *   `useSessionStore`: Handles the high-level progression (dailyWords array, currentIndex, currentPhase). The Orchestrator *only* subscribes to this.
    *   `useSentenceStore`: Handles the volatile typing data (sentenceInput, isEvaluating, feedback). Only the `SentenceBuilderUI` subscribes to this.
*   **Edge Case Fixes:** 
    *   *Empty Database:* Add explicit length checks in `/app/page.tsx` and a safe fallback UI.
    *   *Static Mission:* Replace the local `.order('created_at')` fetch with a new Supabase RPC `get_daily_mission()` that filters out already-completed words via `NOT IN`.
*   **Routing Architecture:** Keep Next.js routing purely top-level.
    *   `/`: Fetches mission, populates session store, routes to `/training`.
    *   `/training`: Hosts the `TrainingSessionUI` client component.
*   **Orchestration Component:** Build `TrainingSessionUI` to act as a state-machine wrapper. It will use Framer Motion's `AnimatePresence` to dynamically swap between phases based *only* on the isolated `useSessionStore` state.

---

## 3. Files to Modify / Create

### Database & Hooks
*   `[NEW]` `apps/web/src/hooks/useDailyMission.ts`: Fetches the array of words for the session.

### State Architecture
*   `[NEW]` `apps/web/src/store/useSessionStore.ts`: Tracks progression (`dailyWords`, `currentIndex`, `currentPhase`).
*   `[NEW]` `apps/web/src/store/useSentenceStore.ts`: Tracks volatile input (`sentenceInput`, `isEvaluating`, `feedback`).
*   `[DELETE]` `apps/web/src/store/useTrainingStore.ts`: Obsolete master store.

### Components
*   `[MODIFY]` `apps/web/src/app/page.tsx`: Transform into the Dashboard entry point with a "Start Mission" CTA.
*   `[NEW]` `apps/web/src/app/training/page.tsx`: The session route wrapper.
*   `[NEW]` `apps/web/src/components/features/training/TrainingSessionUI.tsx`: The orchestrator component using `AnimatePresence`.
*   `[NEW]` `apps/web/src/components/features/training/SessionCompleteUI.tsx`: The celebration screen shown at the end.
*   `[MODIFY]` `apps/web/src/components/features/training/SmartVocabUI.tsx`: Hook up the "Next" button to call `store.setPhase('ready_for_sentence_builder')`.
*   `[MODIFY]` `apps/web/src/components/features/training/SentenceBuilderUI.tsx`: Hook up the "Next Word" button to call `store.nextWord()`.

---

## 4. Step-by-Step Tasks

### Phase 1: State & Data
1.  Update `useTrainingStore.ts` with the new properties (`dailyWords`, `currentIndex`, expanded `TrainingPhase`) and action helpers.
2.  Create `useDailyMission.ts` to fetch a simple array of 3 words from the `vocabulary` table using Supabase.

### Phase 2: The Orchestrator
3.  Build `TrainingSessionUI.tsx`. Implement the `AnimatePresence` switch statement based on the store's current phase and index.
4.  Build a simple `SessionCompleteUI.tsx` with a "Back to Home" button and a celebration graphic.
5.  Create `/training/page.tsx` and insert the orchestrator. Add a robust hydration/state-loss check (`if (dailyWords.length === 0)` redirect to `/`).

### Phase 3: Dashboard & Component Wiring
6.  Update `/page.tsx` (Dashboard). Add the `useDailyMission` hook. Display a giant "START TODAY'S MISSION" button that populates the store and pushes the router to `/training`.
7.  Update `SmartVocabUI.tsx` "Next" button to point to the store's progression action.
8.  Update `SentenceBuilderUI.tsx` "Next Word" button to point to the store's `nextWord` action (which handles index incrementing or moving to the `completed` phase).

---

## 5. Tradeoffs
*   **Zustand (In-Memory) vs. URL Query Params for Session Tracking:**
    *   *Tradeoff:* We are storing the active session state (`currentIndex`, `phase`) purely in memory via Zustand, rather than putting `?word=123&phase=reading` in the URL.
    *   *Why:* To keep the UI "locked down" for children. They shouldn't be able to manually manipulate the URL to skip phases. The downside is that a hard browser refresh wipes the session, but our redirect fallback in `TrainingSessionUI` mitigates this safely by just sending them back to the start.
*   **Heavy Orchestrator vs. Individual Routes:**
    *   *Tradeoff:* Putting all the component swapping logic inside a single `TrainingSessionUI` makes the file larger and more responsible.
    *   *Why:* It is the only way to achieve seamless, jank-free cross-fade animations between complex components using Framer Motion's `AnimatePresence`. Next.js page transitions often cause layout shifts.

---

## 6. Risks
*   **Layout Shift in Orchestrator:** Swapping `<SmartVocabUI>` (which can be tall with many variations) with `<SentenceBuilderUI>` might cause the screen to jump if the exiting component is removed before the entering component is painted.
    *   *Mitigation:* Enforce `mode="wait"` on `<AnimatePresence>` and apply absolute positioning or `min-h-[80vh]` to the wrapper container.
*   **RLS Policies on Vocabulary:** The `useDailyMission` hook will fail if the child's authenticated session cannot `SELECT` from the public `vocabulary` dictionary.
    *   *Mitigation:* Double-check Supabase RLS policies before deploying the hook.
