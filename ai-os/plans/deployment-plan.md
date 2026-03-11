# VocaFit Deployment Plan

This document outlines the DevOps strategy for deploying the VocaFit SaaS project. It covers cloud infrastructure, CI/CD pipelines, and environment variable management for both the Next.js frontend and the Supabase backend.

## 1. Cloud Deployment Strategy

We will utilize a modern serverless stack to ensure high availability, scalability, and ease of deployment.

### Frontend: Vercel
- **Technology:** Next.js (App Router), React, TailwindCSS.
- **Hosting:** Vercel.
- **Why Vercel?** Native support for Next.js, zero-configuration deployments, global CDN, and seamless GitHub integration. Server Actions and API routes are automatically deployed as serverless functions.

### Backend & Database: Supabase
- **Technology:** PostgreSQL, Supabase Auth, Supabase Edge Functions (Deno).
- **Hosting:** Supabase Managed Cloud.
- **Strategy:**
  - **Database & Auth:** Managed by Supabase dashboard. Migrations will be code-controlled using the Supabase CLI.
  - **Edge Functions:** Deployed via the Supabase CLI (`generate-variations`, `portone-webhook`, etc.).
  - **Infrastructure as Code (IaC):** Database changes will be tracked in `supabase/migrations`.

---

## 2. Environment Variables Setup

Environment variables must be configured separately for the Frontend (Vercel) and the Backend (Supabase Edge Functions).

### A. Frontend Variables (Vercel)
These variables need to be added to the Vercel Project Settings -> Environment Variables.

| Variable Name | Description | Environment |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL for the client SDK | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Auth Key | All |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | PortOne Store ID (Client-side checkout) | Production / Preview |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | PortOne Channel Key | Production / Preview |

### B. Backend Variables (Supabase Edge Functions)
These variables must be set securely using the Supabase CLI: `supabase secrets set --env-file ./supabase/.env.production`

| Variable Name | Description |
| :--- | :--- |
| `SUPABASE_URL` | Supabase Project URL (often injected automatically by Supabase, but strictly required for Admin Client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Bypasses RLS - Keep Secret!) |
| `PORTONE_API_KEY` | PortOne REST API Key (Webhook verification) |
| `PORTONE_API_SECRET` | PortOne REST API Secret (Webhook verification) |
| `OPENAI_API_KEY` | OpenAI API Key (Smart Vocabulary AI generation using gpt-4o-mini) |

*(Note: Never commit `.env` files to the repository.)*

---

## 3. CI/CD Pipeline (GitHub Actions)

To automate deployments and ensure code quality, we will set up GitHub Actions workflows.

### Workflow 1: Frontend Quality & Vercel Preview (On Pull Request)
- **Trigger:** Pull Requests to `main`.
- **Steps:**
  1. **Checkout Code:** `actions/checkout@v4`
  2. **Setup Node.js & pnpm:** Install dependencies.
  3. **Linting & Type Checking:** Run `npx eslint .` and `npx tsc --noEmit`.
  4. **Build Test:** Run `npm run build` to ensure the Next.js app compiles successfully.
  5. *Note: Vercel's native GitHub integration will automatically generate a Preview URL for every PR. We will rely on Vercel's built-in bot for PR deployments.*

### Workflow 2: Backend Supabase Deployment (On Push to Main)
- **Trigger:** Push to `main` branch.
- **Steps:**
  1. **Checkout Code:** `actions/checkout@v4`
  2. **Setup Supabase CLI:** Use `supabase/setup-cli@v1`.
  3. **Link Project:** Authenticate with Supabase using a `SUPABASE_ACCESS_TOKEN` stored in GitHub Secrets.
  4. **Push DB Migrations:** Run `supabase db push` to apply any new SQL schema changes to the production database.
  5. **Deploy Edge Functions:** Run `supabase functions deploy` to push all functions in `supabase/functions/` to production.

---

## 4. Implementation Steps (Next Phase)

When approved, the deployment configuration will be implemented through the following steps:

1.  **Create GitHub Actions Workflows:** Draft the `.github/workflows/main.yml` file for the Supabase CI/CD.
2.  **Define NPM Scripts:** Add necessary build scripts (`npm run build`, `npm run type-check`) in `package.json`.
3.  **Setup Supabase Config:** Ensure `supabase/config.toml` is properly configured with the production `project_id`.
4.  **Local Environment Mocking:** Create a `.env.example` template for future developers.
5.  **Documentation:** Provide a brief "How to deploy" guide in the README.
