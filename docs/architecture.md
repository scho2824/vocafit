# System Architecture: VocaFit (AI English Learning App)

This document outlines the system architecture for the AI-powered English Learning App, focusing on scalability, simplicity, and a micro-SaaS approach.

## 1. High-Level Architecture
The system follows a modern decoupled architecture, leveraging a BaaS (Backend-as-a-Service) for rapid development and scalability, and an AI-native edge API for intelligence.

- **Frontend (Client):** Next.js (React) Web App (PWA)
- **Backend & Database:** Supabase (PostgreSQL)
- **AI & Integrations:** OpenAI API
- **Deployment & Hosting:** Vercel (Frontend) + Supabase Cloud (Backend)

---

## 2. Frontend Architecture
The frontend is designed to be highly interactive, responsive (tablets/desktops for kids), and performant.

*   **Framework:** **Next.js** (App Router) with **React** and **TypeScript**. Next.js provides excellent routing, SEO (if needed for marketing pages), and optimized asset delivery.
*   **Styling & UI:** **Tailwind CSS** for rapid UI development and **Framer Motion** for fluid, engaging, kid-friendly micro-animations.
*   **State Management:**
    *   **Server State:** **React Query (@tanstack/react-query)** for caching, fetching, and synchronizing asynchronous data from Supabase and Edge Functions.
    *   **Client State (Local UI):** **Zustand** for lightweight, boilerplate-free global state (e.g., active session details, UI toggles).
*   **Audio/Voice:**
    *   **STT (Speech-to-Text):** Browser native Web Speech API (fallback to Whisper if needed).
    *   **TTS (Text-to-Speech):** Browser native Synthesis API (fallback to OpenAI TTS for higher quality).

---

## 3. Backend & Database Architecture
We leverage **Supabase** as our primary BaaS to minimize ops overhead while maintaining the power of a relational database.

*   **Database Engine:** **PostgreSQL** (via Supabase).
*   **Key Schemas (Draft):**
    *   `users` / `profiles`: Child profiles, parents' account info, difficulty settings.
    *   `vocabulary`: The core dictionary of target words, definitions, and base examples.
    *   `sessions`: Daily training activity logs, tracking completion and streak data.
    *   `user_sentences`: History of sentences constructed by the user, AI feedback received, and scores.
*   **Data Access:** Supabase Client (PostgREST) directly from the Frontend for standard CRUD operations (secured via Row Level Security).

---

## 4. Authentication
*   **Provider:** **Supabase Auth**.
*   **Flow:**
    *   Parents sign up via Email/Password or OAuth (Google/Apple).
    *   JWT-based session management.
    *   **Row Level Security (RLS)** in PostgreSQL ensures that parents and children can only access their own profiles, progress, and history.

---

## 5. API Structure
The API is divided into two layers: Direct Database Access and Edge Functions.

### 5.1. Direct Database API (PostgREST)
Used for standard data fetching where the client interacts directly with Supabase.
*   `GET /rest/v1/profiles` (Fetch user stats)
*   `GET /rest/v1/vocabulary?level=beginner` (Fetch daily words)
*   `POST /rest/v1/sessions` (Log a completed workout)

### 5.2. AI Edge Orchestration (Supabase Edge Functions)
To securely communicate with OpenAI API without exposing secrets on the frontend, we use Supabase Edge Functions (Deno).

*   `POST /functions/v1/evaluate-sentence`
    *   **Input:** `{ "target_word": "negotiate", "user_sentence": "I negotiate for candy." }`
    *   **Logic:** Authenticates user via auth header -> Forwards prompt to OpenAI (`gpt-4o-mini`) -> Parses JSON response -> Saves result to `user_sentences` table -> Returns feedback to client.
    *   **Output:** `{ "grammar_correct": true, "score": 85, "feedback": "Good job!", "suggestion": "I negotiated for candy." }`
*   `POST /functions/v1/generate-variations`
    *   **Input:** `{ "word": "maintain" }`
    *   **Logic:** Calls OpenAI to generate kid-friendly collocations/phrases dynamically.

---

## 6. Deployment Strategy
*   **Frontend Deployment:** **Vercel**. Provides native Next.js support, edge caching, and preview deployments for every PR.
*   **Backend Deployment:** **Supabase Cloud**. Fully managed PostgreSQL, Auth, and Edge Functions.
*   **CI/CD:** GitHub Actions to run TypeScript checks, linting, and automated tests before allowing merges to the `main` branch. Vercel automatically deploys the `main` branch.

---

## 7. Scalability & Simplicity Considerations

1.  **Simplicity First (BaaS over Custom Backend):** By using Supabase for DB, Auth, and Edge Functions, we eliminate the need to run and maintain a custom Node.js/Python server container (e.g., Express/FastAPI). This drastically reduces operational complexity.
2.  **Stateless AI API:** The Edge Functions are stateless. The LLM (`gpt-4o-mini`) processes each sentence evaluation independently. This allows the AI evaluation endpoints to scale infinitely depending on the incoming traffic without locking up resources.
3.  **Edge Caching:** Static assets and marketing pages will be heavily cached on Vercel's Edge Network for rapid global delivery.
4.  **Database Scalability:** PostgreSQL handles relational data gracefully. With proper indexing on `profile_id` and timestamps, querying progress tables will remain fast even with millions of rows. Supabase allows easy vertical scaling (upgrading instance size) and read replicas if read volume surges.
5.  **Cost Efficiency:** Using `gpt-4o-mini` over heavier models ensures we can process thousands of AI sentence evaluations for pennies, keeping unit economics highly profitable for a Micro-SaaS.
