# Deployment Tasks

## Phase 1: Environment Variables & Basic Configuration
- [x] **Config Updates:** In `package.json`, add `"type-check": "tsc --noEmit"` to the scripts section if it doesn't already exist.
- [x] **Local Environment Template:** Create a `.env.example` file in the root directory based on the variables listed in the deployment plan (including `OPENAI_API_KEY`, Supabase, and PortOne keys).
- [x] **Supabase Config:** Ensure `supabase/config.toml` has the correct `project_id` set (or placeholder for production ID).

## Phase 2: GitHub Actions for Frontend (Vercel Integration)
- [x] **Create Workflow File:** Create `.github/workflows/frontend-quality.yml`.
- [x] **Define Trigger:** Set the action to trigger on `pull_request` to the `main` branch.
- [x] **Build & Test Steps:** Configure steps for `actions/checkout@v4`, setting up Node/pnpm, running `npx eslint .`, `npm run type-check`, and `npm run build`. 
*(Note: Actual Vercel deployment is handled natively by the Vercel GitHub App).*

## Phase 3: GitHub Actions for Backend (Supabase)
- [x] **Create Workflow File:** Create `.github/workflows/supabase-deploy.yml`.
- [x] **Define Trigger:** Set the action to trigger on `push` to the `main` branch.
- [x] **Supabase Setup:** Configure steps for `actions/checkout@v4` and `supabase/setup-cli@v1`.
- [x] **Authentication Configuration:** Add a step to authenticate the CLI using `SUPABASE_ACCESS_TOKEN` (which will be stored in GitHub Secrets).
- [x] **Deploy Database:** Add step to run `supabase db push` to push SQL migrations.
- [x] **Deploy Edge Functions:** Add step to run `supabase functions deploy` to push all edge functions to production.

## Phase 4: Documentation
- [x] **Update README:** Add a brief "Deployment Instructions" section to the main `README.md` explaining how the automated Vercel and Supabase pipelines work, and reminding developers to set the required Secrets in GitHub (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`) and environment variables in the Supabase/Vercel dashboards.
