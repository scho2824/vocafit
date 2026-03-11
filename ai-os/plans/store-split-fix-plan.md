# Store Split Fix Plan

## 1. Issue: Volatile State Leaks (`useSentenceStore`)

### Root Cause
The `useSentenceStore` persists outside the React component lifecycle because Zustand stores are global variables. Currently, the volatile state (`sentenceInput`, `feedback`, `isEvaluating`) is only cleared when the user successfully clicks "Next Word" (`resetSentence` is called).
If a user clicks "Back to Home", closes the tab, or the component unmounts for any other reason, the global store retains the half-typed sentence or previous failure state. When they return to `SentenceBuilderUI`, the old state is hydrated.

### Architectural Fix
We need to bind the reset of the volatile store to the lifecycle of the component that uses it, guaranteeing clean state whenever the learning phase is mounted.

### Proposed Code Changes
*   **File:** `apps/web/src/components/features/training/SentenceBuilderUI.tsx`
*   **Action:** Add a `useEffect` cleanup function that calls `resetSentence()` when the component unmounts.
*   **Implementation Details:**
    ```typescript
    useEffect(() => {
        // ... auto-focus logic ...

        // Cleanup: Guarantee volatile state is wiped if the user abandons the session early
        return () => {
             useSentenceStore.getState().resetSentence();
        };
    }, []);
    ```

---

## 2. Issue: Keystroke Re-renders in `SentenceBuilderUI`

### Root Cause
`SentenceBuilderUI.tsx` directly uses the global `useSentenceStore` to manage the `<textarea>`'s `value` and `onChange`.
Because `SentenceBuilderUI` subscribes to `sentenceInput` via `useSentenceStore((s) => s.sentenceInput)`, every single keystroke triggers a Zustand state update, which in turn triggers a full React re-render of the *entire* `SentenceBuilderUI` component (including the Paywall check, Framer Motion AnimatePresence trees, etc.).

### Architectural Fix
To achieve Micro-SaaS standard 60fps performance on mobile, the high-frequency keystroke state must be managed *locally* by React (`useState`), not globally by Zustand. 
We only need to sync the input string to the global store *when the user submits the form for evaluation*.

### Proposed Code Changes
*   **File:** `apps/web/src/components/features/training/SentenceBuilderUI.tsx`
*   **Action:**
    1.  Remove `sentenceInput` and `setSentenceInput` subscriptions from the main component body.
    2.  Introduce local state: `const [localInput, setLocalInput] = useState('');`
    3.  Bind the `<textarea>` to `localInput` and `setLocalInput`.
    4.  Update `handleSubmit` to use `localInput` for the API payload.
    5.  *(Optional but safe)* `resetSentence()` on successful "Next Word" will clear everything else; the local state naturally resets when the component unmounts/remounts for the next word.

*   **Implementation Notes:**
    *   This eliminates 99% of re-renders while typing. The component will only re-render when `isEvaluating` or `feedback` changes (which are low-frequency events).

---

## Verification Plan

### 1. State Leak Fix
*   **Manual Test:** 
    1. Start a session, type "abc" in the sentence builder.
    2. Click the browser's back button or manually navigate to `/` via the address bar.
    3. Start a new session and reach the sentence builder phase again. 
    4. **Expected:** The textarea should be empty, not showing "abc".

### 2. Re-render Fix
*   **React DevTools (Profiler):** 
    1. Start a React Profiler session.
    2. Type 10 characters rapidly into the `SentenceBuilderUI` textarea.
    3. Stop the profiler.
    4. **Expected:** No commits from `SentenceBuilderUI` should be recorded for the keystrokes (only the initial mount). Only the internal `<textarea>`/local state should be updating.
