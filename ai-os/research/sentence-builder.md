# Research: Sentence Builder Trainer

## 1. Overview & Context
The **Sentence Builder Trainer** is one of the two core features of the VocaFit English Learning App (detailed in `docs/project-brain.md` and `docs/architecture.md`). It addresses the fundamental problem of traditional language apps—passive memorization—by forcing active vocabulary production in real-world contexts. 

The primary target audience is Korean children (ages 7-12). Therefore, the application of "Child-Centric Design Principles" (Simplicity, Positive Feedback Loop, Safety & Focus) is heavily emphasized across the entire module.

---

## 2. Architecture
The underlying architecture aligns with the app’s Micro-SaaS standard, focusing on a decoupled, AI-native API layer alongside a state-driven client application.

### Frontend
- **Framework**: Next.js (React) + TypeScript targeting a flat, single-action PWA experience on tablets and desktops.
- **Styling**: Tailwind CSS + Framer Motion. Framer Motion is strictly responsible for rendering the "Positive Feedback Loop" micro-animations (e.g., celebratory effects when grammar is correct).
- **Client State**: Zustand provides lightweight, boilerplate-free local state management for active session details (e.g., current word index, active input, retry states).
- **Server State**: React Query bridges interaction with the Next.js routes and Supabase, caching the daily target words and vocabulary arrays.

### Backend (BaaS)
- **Supabase PostgreSQL**: The relational database housing the `vocabulary` dictionary, `user_sentences` history logs, and daily `sessions`.
- **Supabase Edge Functions (Deno)**: Secures the API layer by abstracting all OpenAI logic away from the client.

### AI Integration
- **OpenAI (`gpt-4o-mini`)**: The evaluation engine behind the input analysis, prompted strictly to return a JSON payload for immediate frontend parsing.
- **Voice Capabilities**: The system utilizes browser-native Web Speech API (STT) for auditory input and Synthesis API (TTS) for pronouncing words and feedback, keeping infrastructure costs low and speeds fast.

---

## 3. Data Flow
1. **Initiation**: React Query fetches the day's training session data (including target words) from Supabase (`GET /rest/v1/vocabulary`) via PostgREST. Zustand sets the initial training state for Phase 2: Sentence Builder.
2. **Prompt Presentation**: The UI displays the target word (e.g., "negotiate") with large, legible typography and optional visual/audio cues (TTS).
3. **User Input Phase**: The user physically types the sentence or speaks via the Web Speech API STT integration.
4. **Submission & Orchestration**: An authenticated POST request containing the target word and the user's sentence is sent to the Supabase Edge Function (`/functions/v1/evaluate-sentence`).
5. **AI Processing**: 
   - The Edge Function wraps the user input in a strict system prompt and forwards it to the OpenAI API (`gpt-4o-mini`).
   - The LLM analyzes the sentence for (1) grammatical correctness, (2) natural phrasing, and (3) proper target word usage against the required contextual constraints.
   - The LLM responds with a standardized JSON construct (e.g., `{ "grammar_correct": true, "naturalness_score": 90, "feedback_message": "...", "suggestion": "..." }`).
6. **Logging & Return**: 
   - The Edge Function updates the `user_sentences` and `sessions` PostgreSQL tables.
   - The Edge Function returns the finalized JSON score object directly to the frontend.
7. **Feedback & Iteration**: 
   - Zustand stores the JSON parsed results.
   - Framer Motion renders kid-friendly animations.
   - Based on the outcome, the user can either retry the prompt to improve their score/grammar (staying within the current word state) or proceed to the next word.

---

## 4. Key Modules
### 4.1. SentenceBuilderUI (Frontend Component)
The core React view that the child interacts with. Governed strongly by "Child-Centric Design Principles":
- Enforces large minimum 48x48px tap targets for developing motor skills.
- Implements "One Action Per Screen" (zero complex navigation or nested settings during the session).
- Displays high-contrast text and visual cues.

### 4.2. Session Manager Store (Zustand)
Manages the user's transition from the Smart Vocab phase to the Sentence Builder phase. Tracks variables such as `currentWordIndex`, `retryCount`, and `currentFeedbackState`.

### 4.3. Voice Integration Hook (React Custom Hook)
A utility wrapper around the browser's Web Speech API and Synthesis API. It handles microphone permissions, transcription chunking (STT), and reading the LLM-generated feedback aloud (TTS).

### 4.4. `evaluate-sentence` (Supabase Edge Function)
The core business logic layer that orchestrates OpenAI API limits, parses the prompt engineering rules, handles the JWT validation header for the active user, and communicates with PostgREST to save the results.

---

## 5. Important Functions
- `fetchTargetWord()`: Uses React Query to load the active vocabulary word and standard definitions from Supabase.
- `handleSentenceSubmit(sentence: string)`: Triggers the evaluation workflow, toggling loading/thinking states and firing the client POST request to the Edge Function.
- `playAudioFeedback(text: string)`: Maps text feedback string variables to native TTS API calls for accessibility and engagement.
- `evaluateSentence(targetWord, userSentence)` *(Edge Function)*: The server-side orchestrator. Validates authorization headers -> Constructs strict JSON LLM prompt -> awaits OpenAI API -> Writes `user_sentences` table -> Returns JSON to client.
- `parseFeedbackResponse(response: JSON)`: Safely parses the Edge Function's payload into distinct UI states (Green checkmarks, encouraging textual strings, suggestive corrections).

---

## 6. Dependencies
- `@supabase/supabase-js`: Standard library for database queries and Auth handling from the frontend.
- `@tanstack/react-query`: For server state fetching and caching the initial training session data.
- `zustand`: For local state synchronization throughout the training loop.
- `openai`: Node SDK (or equivalent Deno library) inside Edge Functions for generating LLM evaluations.
- `framer-motion`: For fluid, child-friendly feedback animations and screen transitions.

---

## 7. Risks & Mitigation Strategies
1. **AI Latency & Attention Loss:**
   - *Risk*: Even fast LLMs (`gpt-4o-mini`) can introduce 1-3 second delays. Children might get distracted or frustrated typing to a lagging interface.
   - *Mitigation*: Implement visually engaging loading states (e.g., an "AI is thinking..." character animation) to maintain focus during edge function execution.

2. **Inappropriate Content Injection:**
   - *Risk*: Users putting inappropriate words or attempting LLM prompt injections.
   - *Mitigation*: The Edge Function must implement strict system prompt boundaries isolating the user input strictly to the evaluation task. A lightweight client-side or edge-side profanity filter is recommended before hitting the OpenAI endpoint.

3. **Speech-to-Text (STT) Frustrations:**
   - *Risk*: Browser native STT can struggle with distinct children's voices or heavy Korean-English accents, leading to incorrect transcriptions and unfair AI feedback.
   - *Mitigation*: Avoid penalizing transcription errors. Allow the user to manually text-edit the STT output before final submission, or gracefully present a 'try speaking clearly one more time' prompt if the sentence is garbled.

4. **UI Clutter (Violating Core Philosophy):**
   - *Risk*: Scope creep leading to additional buttons (e.g., intricate settings, translation layers) crowding the screen during the evaluation phase.
   - *Mitigation*: Strictly enforce the "No Complex Nested Navigation" and "One Action Per Screen" rules outlined in `project-brain.md`. The design must fail if complicated nested states are introduced.
