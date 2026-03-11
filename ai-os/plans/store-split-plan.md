# Implementation Plan: Store Split Architecture

## 1. Goal
Implement the "Store Split" state management architecture by creating the missing Zustand stores (`useSessionStore`, `useSentenceStore`) and adding strict TypeScript typings to the VocaFit training UI components.

## 2. Approach
The current codebase has critical technical debt: `TrainingSessionUI.tsx` and its child components attempt to import non-existent Zustand stores and use implicitly typed `any` selectors. 
We will implement two isolated Zustand stores following the architecture outlined in `docs/project-brain.md`:
1.  **`useSessionStore`**: Manages global progression (daily words, current index, current phase).
2.  **`useSentenceStore`**: Manages volatile, rapid-changing inputs (textarea value, evaluation loading state, AI feedback).

We will then refactor the components to use proper TypeScript definitions for the state selectors to resolve the `implicit any` build errors.

## 3. Files to Modify/Add

### [NEW] `apps/web/src/store/useSessionStore.ts`
- Defines the `SessionState` interface.
- Includes actions: `startSession`, `nextWord`, `incrementEvaluation`.

### [NEW] `apps/web/src/store/useSentenceStore.ts`
- Defines the `SentenceState` interface.
- Includes actions: `setSentenceInput`, `setIsEvaluating`, `setFeedback`, `resetSentence`.

### [MODIFY] `apps/web/src/app/page.tsx`
- Ensure `startSession` call matches the new store typing.

### [MODIFY] `apps/web/src/app/training/page.tsx`
- Ensure `dailyWords` selector correctly infers the `SessionState` type (e.g., `s => s.dailyWords` will automatically type if the store is genericized properly, otherwise explicit typing might be checked).

### [MODIFY] `apps/web/src/components/features/training/TrainingSessionUI.tsx`
- Update component to correctly type the Zustand selectors.

### [MODIFY] `apps/web/src/components/features/training/SentenceBuilderUI.tsx`
- Update component to correctly type the Zustand selectors relying on both stores.

### [MODIFY] `apps/web/src/components/features/training/SessionCompleteUI.tsx`
- Update component to correctly type the Zustand selectors.

## 4. Step-by-Step Tasks

1. **Create `useSessionStore.ts`**: Define the typing for `ReviewWord`, `Phase`, and initialize the Zustand store with `dailyWords: []`, `currentIndex: 0`, `currentPhase: 'smart_vocabulary'`, and `evaluationCount: 0`. Implement the state mutators.
2. **Create `useSentenceStore.ts`**: Define the typing for `SentenceFeedback` and initialize the Zustand store with `sentenceInput: ''`, `isEvaluating: false`, and `feedback: null`. Implement the mutators and `resetSentence` helper.
3. **Refactor UI Implicit Any Errors**: Ensure all components importing these stores benefit from Zustand's automatic type inference, or explicitly cast `(s: SessionState)` if necessary to resolve the strict `tsc` compiler errors.
4. **Compile & Verification**: Run `npx tsc --noEmit` to ensure all TypeErrors (`TS2307`, `TS7006`) reported during the Notification QA phase relating to the stores are eliminated.

## 5. Trade-offs & Considerations
- We are maintaining the architectural split rather than merging them into one giant store. This prevents the `TrainingSessionUI` from re-rendering on every single keystroke typed into the `SentenceBuilderUI` textarea, keeping the app performant for mobile devices on low battery.
- The `incrementEvaluation` logic relies on `useSessionStore` instead of `useSentenceStore` because the evaluation count needs to persist across different words in the daily mission to trigger the paywall barrier globally.
