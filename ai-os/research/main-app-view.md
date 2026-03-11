# Exhaustive Research Document: Main App View Integration

## 1. Executive Summary & Goal
The objective is to synthesize the isolated `SmartVocabUI` and `SentenceBuilderUI` components into a unified, seamless "Daily Training Session" experience for the child, while building the surrounding App Shell (Dashboard). Following the strict directives of the `project-brain.md` file, this integration must physically prevent complex navigation, adhere to "One Action Per Screen," and provide idiot-proof state recovery.

---

## 2. Global Architecture & Routing

To maintain the flat UI constraint mandated by the "Child-Centric Design Principles," deep nesting of Next.js routes during the active learning phase is prohibited. Next.js App Router will be used only for top-level boundary transitions.

### 2.1 Route Structure
1.  **`/` (Dashboard / Main App View)**
    *   **Role:** The entry point. It fetches the daily mission (e.g., 3 specific vocabulary words) for the authenticated child.
    *   **UI Elements:** A prominent, massive "START TODAY'S MISSION" Call-To-Action (CTA). No sidebars. No complex settings.
    *   **State Interaction:** Tapping "Start" pushes the selected daily words into the global `useTrainingStore` and routes the browser to `/training`.

2.  **`/training` (The Session Orchestrator Environment)**
    *   **Role:** A locked-down, distraction-free environment. No headers, no footers, just the active learning components.
    *   **Architecture:** This route hosts a single Client Component `TrainingSessionUI`.
    *   **Routing within `/training`:** There is **NO** Next.js routing going on here. The progression from Word 1 (Reading) -> Word 1 (Sentence) -> Word 2 (Reading)... is handled entirely by swapping React components based on the Zustand `useTrainingStore` state.

---

## 3. Data Flow & State Management (Zustand)

The `useTrainingStore` is the central brain of the `/training` route. It must be expanded to handle an array of words rather than a single word ID.

### 3.1 Required State Expansions
Currently, the store tracks `currentPhase` and a single `currentWordId`. It must be refactored to:
*   `dailyWords: { id: string, word: string }[]` - The queue of words for the day.
*   `currentIndex: number` - Tracks which word in the array the child is currently learning.
*   `currentPhase: 'reading' | 'listening' | 'sentence_builder' | 'completed'` - The localized state for the *current* word.

### 3.2 The Progression Algorithm
The `advancePhase()` logic (either in the store or the Orchestrator) represents the core data flow:

1.  **Initial State:** `currentIndex = 0`, `currentPhase = 'reading'`.
2.  **Child clicks "Next: Build Sentence":** `setPhase('sentence_builder')`.
3.  **Child submits sentence & gets `success: true` -> clicks "Next Word":**
    *   Check: `if (currentIndex + 1 < dailyWords.length)`
    *   **TRUE:** `setCurrentIndex(currentIndex + 1)`, `setPhase('reading')`.
    *   **FALSE:** `setPhase('completed')`.

---

## 4. Key Modules & Components to Build

### 4.1 `useDailyMission` (React Query Hook)
*   **Path:** `apps/web/src/hooks/useDailyMission.ts`
*   **Responsibility:** Fetches a tailored list of words from the `vocabulary` table.
*   **Note:** For MVP, this could just fetch 3 random words where `level = 'beginner'`. Later, this will be tied to a spaced-repetition algorithm based on `sessions` or `user_sentences` history.

### 4.2 `DashboardUI` (Server/Client Component)
*   **Path:** `apps/web/src/app/page.tsx`
*   **Responsibility:** Replace the default Next.js boilerplate. Fetch the `useDailyMission` array. On click of "Start", populate the Zustand store with the fetched IDs and call `router.push('/training')`.

### 4.3 `TrainingSessionUI` (Client Component)
*   **Path:** `apps/web/src/app/training/page.tsx` (or a dedicated component imported there).
*   **Responsibility:** The Orchestrator.
*   **Implementation Details:**
    ```tsx
    const { currentPhase, currentIndex, dailyWords } = useTrainingStore();
    const currentWord = dailyWords[currentIndex];

    return (
      <AnimatePresence mode="wait">
        {currentPhase === 'reading' && (
           <motion.div key="vocab" exit={{ opacity: 0, x: -100 }}>
             <SmartVocabUI wordId={currentWord.id} />
           </motion.div>
        )}
        {currentPhase === 'sentence_builder' && (
           <motion.div key="sentence" initial={{ opacity: 0, x: 100 }} animate={{ opacity:1, x:0 }}>
             <SentenceBuilderUI targetWord={currentWord.word} />
           </motion.div>
        )}
        {currentPhase === 'completed' && (
           <SessionCompleteUI />
        )}
      </AnimatePresence>
    )
    ```

### 4.4 `SessionCompleteUI`
*   **Responsibility:** The celebration screen. Displays fireworks/confetti (via Framer Motion or a lightweight Lottie), updates the database streak via a new Supabase RPC or insert call, and provides a single button to return to `/`.

---

## 5. Important Functions & API Integration Points

1.  **`startSession(words)`:** A Zustand action that initializes the store payload when leaving the dashboard.
2.  **`handleNextPhase()`:** The unified progression event handler attached to the success buttons in both `SmartVocabUI` and `SentenceBuilderUI`.
3.  **`POST /rest/v1/sessions`:** When `currentPhase` hits `'completed'`, a React Query mutation must fire to log the completed session into the database to track the child's daily streak.

---

## 6. Risks, Edge Cases & Mitigations

### 6.1 State Loss on Browser Refresh (High Risk)
*   **The Problem:** If a child is on word 2 of 3 and accidentally hits the browser refresh button or switches tabs on a mobile device causing an aggressive background page reload, the Zustand `useTrainingStore` will revert to initial state (empty array, index 0). The `/training` route will hard-crash because `dailyWords[currentIndex]` will be undefined.
*   **Mitigation Strategy:** 
    *   **Option A (Persist Middleware):** Wrap `useTrainingStore` in `persist()` utilizing `localStorage`. This allows a hard refresh to resume exactly where they left off.
    *   **Option B (Graceful Fallback):** In `TrainingSessionUI`, add a strict `useEffect` check: `if (dailyWords.length === 0) router.replace('/')`. This forces them safely back to the dashboard to restart if state is lost. *Given the app is for children learning small 3-word chunks, Option B is much safer and less prone to corrupted localStorage states.*

### 6.2 Layout Janks during Component Swapping (Medium Risk)
*   **The Problem:** Because `SentenceBuilderUI` has a different height than `SmartVocabUI`, switching between them using `AnimatePresence` can cause the parent container to abruptly resize, jerking the UI aggressively (a violation of smooth kid-friendly design).
*   **Mitigation Strategy:** The wrapper `div` in `TrainingSessionUI` must have a rigid minimum height (e.g., `min-h-[80vh]`) and `AnimatePresence` should use `mode="wait"` to guarantee one component is fully destroyed and unmounted from the DOM *before* the next one starts fading in. 

### 6.3 Database RLS on Dashboard Fetch (Low Risk)
*   **The Problem:** Fetching the daily mission requires querying the `vocabulary` table. If RLS is set strictly to `auth.uid() = user_id`, global vocabulary words might be blocked unless handled by a Service Role hook.
*   **Mitigation Strategy:** Ensure `vocabulary` table RLS allows `SELECT` for all authenticated users, not just an owner ID, as the dictionary is a shared resource.
