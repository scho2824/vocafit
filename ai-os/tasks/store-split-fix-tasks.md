# Store Split Fix Actionable Tasks

## 1. Volatile State Leaks Fix
- [x] Implement `useEffect` unmount cleanup in `SentenceBuilderUI.tsx` to call `useSentenceStore.getState().resetSentence()`.

## 2. Keystroke Re-renders Fix
- [x] Remove `sentenceInput` and `setSentenceInput` Zustand bindings from `SentenceBuilderUI.tsx`.
- [x] Add `useState` for local `sentenceInput` management.
- [x] Update `<textarea>` to use local state `value` and `onChange`.
- [x] Update `handleSubmit` to pass local `sentenceInput` to the API via `evaluateSentence.mutateAsync`.
- [x] Bind "Try Again" and "Next Word" buttons to also clear local text state.

## 3. Verification
- [x] Run `npx tsc --noEmit` to ensure types remain clean.
- [x] (Manual/Status Check) Verify no re-render behavior is logged heavily via React Profiler when typing in the `<textarea>`.
