# Project Brain: AI-powered English Learning App

## 1. Project Overview
**Product Name:** [TBD - e.g., VocaFit Kids / LingoSprout]
**Type:** Micro-SaaS
**Target Audience:** Korean children (ages 7-12) learning English, and their parents.
**The Core Problem:** Traditional English learning apps rely on passive memorization (flashcards, multiple-choice), which fails to teach children how to actually *use* the language. Furthermore, existing interfaces are often cluttered and overwhelming for young learners.
**Value Proposition:** Moving beyond passive memorization. We provide an active, context-driven English learning environment where children practice constructing sentences and using vocabulary in real-world contexts, guided by instant, encouraging, and accurate AI feedback.
**Core Philosophy:** "Active Production > Passive Consumption."

### 1.1. Child-Centric Design Principles (Core Philosophy)
These principles are deeply embedded into every aspect of this project and must drive all architectural and UI/UX decisions:
1.  **UI/UX Simplicity:** The interface must be extremely simple, intuitive, and distraction-free. If a 7-year-old cannot understand what to do within 3 seconds, the design has failed.
2.  **Positive Feedback Loop:** AI feedback must be visually clear, highly encouraging, and immediate. We celebrate attempts, not just perfection.
3.  **Safety & Focus:** Prevent users from getting lost. Zero complex navigation menus. The user journey should feel like a safe, guided track, not an open web browser.

## 2. Core Features

### 2.1. Sentence Builder Trainer
*   **Core Idea:** Transitions the user from knowing a word to actually using it. The user is prompted with a target word, constructs a sentence, and receives immediate AI evaluation.
*   **Key Mechanics:**
    *   **Input:** User types a sentence using the word.
        1.  Grammatical correctness.
        2.  Natural phrasing/Idiomatic usage.
        3.  Appropriate use of the target word.
    *   **Feedback Delivery:** Instant, kid-friendly feedback (adhering to the Positive Feedback Loop principle).
        *   *Example:* "✔ Correct grammar! ✔ Very natural! 💡 Suggestion: You could also say: 'I tried to negotiate the price down.'"
*   **Goal:** Train active sentence construction skills and provide high-value, personalized coaching that static apps cannot offer.

### 2.2. Smart Vocabulary Trainer
*   **Core Idea:** Context-based learning to demonstrate how words are actually used in different situations, avoiding isolated flashcard memorization.
*   **Key Mechanics:**
    *   **Word Introduction:** Display the word, pronunciation audio, and meaning.
    *   **Contextual Examples:** Provide a clear, level-appropriate example sentence. (e.g., Target: "maintain" -> "It is important to maintain good habits.")
    *   **Prompt Engineering:** Strict system prompts demanding output in structured JSON format (e.g., `{ "grammar_correct": true, "naturalness_score": 90, "feedback_message": "...", "suggestion": "..." }`) to ensure reliable frontend parsing.
*   **Goal:** Deepen vocabulary comprehension by training real-world usage and collocations.

### 2.3. Progress tracking & Engagement (Supporting MVP Feature)
*   **Streaks & Daily Goals:** Simple tracking to keep children motivated.
*   **Activity Logs:** Basic history of learned words and created sentences for parent review (kept out of the child's primary view to maintain UI Simplicity).

## 3. User Flow

1.  **Onboarding:**
    *   User (Parent) signs up and creates a child profile.
    *   Selects starting difficulty level.
2.  **Dashboard (Daily View):**
    *   Displays today's mission (e.g., "Learn 3 words, Build 3 sentences").
    *   Call-to-action button to start the training session.
3.  **Training Session - Phase 1: Smart Vocab:**
    *   App presents a new word in context (Definition + Audio).
    *   User interacts with AI-generated variations and examples.
4.  **Training Session - Phase 2: Sentence Builder:**
    *   App challenges the user to use the newly learned word in a sentence.
    *   User inputs the sentence -> AI processes -> Displays feedback.
    *   User can retry to improve the sentence or proceed to the next word.
5.  **Session Completion:**
    *   Celebration screen summarizing achievements.
    *   Return to Dashboard.

## 4. System Architecture & Data Flow

**Philosophy:** Lean, scalable, fast to iterate, and AI-native (Micro-SaaS standard).

*   **Frontend (Client):** Next.js (React) + TypeScript.
    *   **Styling:** Tailwind CSS + Framer Motion (for fluid, engaging, kid-friendly micro-animations).
    *   **State Management Architecture (Store Split):** To guarantee fluid UI performance and prevent React re-render cascades, global state is strictly segregated by volatility:
        *   **`useSessionStore` (Progression State):** Manages high-level routing (`dailyWords`, `currentIndex`, `currentPhase`). Only the layout orchestrator subscribes to this.
        *   **`useSentenceStore` (Volatile State):** Manages rapidly changing inputs (`sentenceInput`, `isEvaluating`, `feedback`). Only the isolated interactive components (like `SentenceBuilderUI`) subscribe to this.
*   **Backend & Database (BaaS):** Supabase (PostgreSQL, Auth, Edge Functions).
    *   **Data Flow (Daily Mission):** The dashboard queries a custom Postgres RPC function (`get_daily_mission()`). This uses a `NOT IN` join against the child's `user_sessions` history to guarantee they only receive *unlearned* words, handling logic at the database layer.
    *   **Data Flow (Session Logging):** Completed sessions are saved using an idempotent Postgres RPC (`log_session_safe()`). It enforces a 2-minute deduplication window based on `user_id` and payload to prevent React double-fires and client-side retry bugs.
*   **AI API Integration:** OpenAI API (`gpt-4o-mini`) via Supabase Edge Functions.

## 5. Coding Principles (Child-Centric UI/UX)

To enforce the core philosophy at the code level, all frontend implementation must follow these rules:
1.  **Large Tap Targets:** All interactive elements (buttons, inputs) must have a minimum size of 48x48px (ideally larger for kids) to accommodate developing motor skills.
2.  **High Contrast & Readability:** Text must be large, legible (e.g., heavily using sans-serif fonts), and contrast ratios must exceed WCAG AA standards.
3.  **Visual Hierarchy:** The primary action on any screen must be overwhelmingly obvious. Secondary actions must be visually minimized.
4.  **Accessibility First:** Use semantic HTML and aria-labels ensure the app works well with screen readers and keyboard navigation.

## 6. Things That Must Not Change (Strict System Constraints)

1.  **No Complex Nested Navigation:** The UI must be flat. Hamburger menus, deep nested settings panes, or multi-tabbed layouts within the child's learning view are strictly forbidden. Use full-screen modal overlays or linear progression instead.
2.  **One Action Per Screen:** Focus is paramount. Avoid putting multiple divergent tasks on a single screen during the training session.
3.  **Fail-Safe Interactions:** All interactions must remain simple. Ensure there are easy, obvious ways to exit or proceed without complex gestures required.

## 7. AI Development Rules (Strict Protocol)

To ensure elite software architecture and maintainable code, all AI coding assistants must strictly adhere to the following protocol:

1.  **Prioritize Child-Centric Design:** The AI must *always* prioritize the Child-Centric Design Principles (Simplicity, Positive Feedback, Safety & Focus) when generating frontend components or planning user flows.
2.  **Plan Before Code (Zero Exception Rule):**
    *   The AI must NEVER write or implement code without first creating a detailed `implementation_plan.md` artifact.
    *   The plan must outline component changes, state architecture, and API endpoints, and must be explicitly approved by the User (Architect/PM).
3.  **Research First:**
    *   Before proposing any plan, the AI must explore the existing codebase to understand established patterns, routing, and styling conventions.
4.  **Document Outputs:**
    *   Upon completion of an implementation phase, the AI must provide a `walkthrough.md` or a clear summary of changes, affected files, and verification steps.
5.  **No Unsolicited Architecture Changes:**
    *   Follow the established architecture. If a major refactor or new package is deemed necessary, it must be pitched as a separate proposal, not bundled silently into feature work.
6.  **Small, Verifiable Steps:**
    *   Break down complex features into smaller, logically separated tool calls and commits.
7.  **Maintain High Code Quality:**
    *   Keep functions pure, isolate side-effects, and enforce strong TypeScript typing.
8.  **Human is Architect, AI is Executor:**
    *   The User owns the technical direction and product vision. The AI suggests, designs, and executes flawlessly based on those directives.

## 8. Known Technical Debt

*   **Missing State Modules:** The `useSessionStore` and `useSentenceStore` modules are missing from the `apps/web/src/store/` directory, causing widespread TypeScript resolution errors (`TS2307: Cannot find module '@/store/... '`). These form the core of the split-store architecture and need to be implemented.
*   **Implicit Any Types:** Numerous React components (`page.tsx`, `SentenceBuilderUI`, `TrainingSessionUI`, etc.) have implicit `any` types in their Zustand selector callbacks (e.g., `(s) => s.dailyWords`), breaking the strict TypeScript build (`TS7006: Parameter 's' implicitly has an 'any' type`). These need proper typing aligned with the missing stores.

