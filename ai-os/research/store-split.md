# Research: Store Split Architecture

## 1. Goal
The objective is to implement the "Store Split" state management architecture in the VocaFit frontend as defined in `docs/project-brain.md`. The design specifically segregates global state into two separate Zustand stores to guarantee fluid UI performance and prevent React re-render cascades.

## 2. Architectural Design Constraints
As mandated by the project architecture:
- **`useSessionStore` (Progression State):** Manages high-level routing. Only the layout orchestrator subcribes to this.
- **`useSentenceStore` (Volatile State):** Manages rapidly changing inputs. Only isolated interactive components subscribe to this.

## 3. Current Codebase Analysis
Deep inspection of the existing codebase (`apps/web/src/components/features/training/`) reveals that UI components are currently importing and attempting to consume these non-existent modules.

### Component Dependency Mapping:

1. **`TrainingSessionUI.tsx` (Orchestrator)**
   - Depends completely on `useSessionStore` to drive the UI layout.
   - *Requires:*
     - `dailyWords`: Array of target words for the mission `[{ id: string, word: string }]`.
     - `currentIndex`: Numeric index indicating current word.
     - `currentPhase`: String indicating sub-view (`'smart_vocabulary' | 'sentence_builder' | 'completed'`).

2. **`SentenceBuilderUI.tsx` (Interactive Layer)**
   - Depends heavily on both stores, segregating input typing from session routing.
   - *Requires from `useSentenceStore`:*
     - `sentenceInput` (string): Live textarea value.
     - `setSentenceInput` (fn): Updater.
     - `isEvaluating` (boolean): Loading state.
     - `setIsEvaluating` (fn): Updater.
     - `feedback` (object | null): Feedback result payload.
     - `setFeedback` (fn): Updater.
     - `resetSentence` (fn): Clears volatile state for the next word.
   - *Requires from `useSessionStore`:*
     - `nextWord` (fn): Advances `currentIndex` and manages `currentPhase` progression.
     - `evaluationCount` (number): Tracks total evaluate attempts (specifically used for Paywall triggers).
     - `incrementEvaluation` (fn): Increases the tracking count.

3. **`SessionCompleteUI.tsx` (End State)**
   - Depends on `useSessionStore`.
   - *Requires:*
     - `dailyWords`: Used to display the completion count and pass words to the `useLogSession` mutation.

4. **`app/page.tsx` (Dashboard Entry Point)**
   - *Requires from `useSessionStore`:*
     - `startSession(dailyMission)` (fn): Initializes the store with the payload fetched from the database before routing into `/training`.

5. **`app/training/page.tsx` (Hydration Guardian)**
   - *Requires from `useSessionStore`:*
     - `dailyWords`: Used to detect if the store was wiped by a hard browser refresh to safely redirect the user.

## 4. Problem & Root Cause of Current TypeScript Errors
- The files `@/store/useSessionStore` and `@/store/useSentenceStore` do not exist.
- Zustand selectors in the components rely on implicit `any` types (e.g., `(s) => s.dailyWords`) which violates strict TypeScript constraints (`TS7006`).

## 5. Technical Requirements for Implementation
To fix this technical debt, we must:
1. Create `apps/web/src/store/useSessionStore.ts`.
2. Create `apps/web/src/store/useSentenceStore.ts`.
3. Define strict TypeScript Interfaces (e.g., `SessionState`, `SentenceState`) for both stores.
4. Update the implicitly typed selectors in the UI components (e.g., changing `(s) => s.dailyWords` to `(s: SessionState) => s.dailyWords`, or relying on inferred types if Zustand is properly genericized).

## 6. Trade-offs / Considerations
- **Why Two Stores?** React components re-render whenever their subscribed Zustand state changes. If `sentenceInput` (which updates on every keystroke) was in the same store as `dailyWords`, the entire `TrainingSessionUI` orchestrator would re-render on every keystroke, causing severe battery drain and UI stutter. Splitting them isolates the keystroke re-renders solely to the `textarea` and its immediate container.
- **Inter-store Communication:** The stores are logically isolated. `SentenceBuilderUI.tsx` correctly acts as the bridge. When a user completes a sentence (volatile state success), the component calls `resetSentence()` on the volatile store and `nextWord()` on the progression store. No direct cross-store subscriptions are needed, maintaining clean boundaries.
