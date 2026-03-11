This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## VocaFit Deployment Instructions

VocaFit uses a modern serverless stack with automated GitHub Actions CI/CD.

### Frontend (Vercel)
The frontend (`apps/web`) is deployed directly via Vercel's GitHub integration. 
- **CI Checks:** Any PR to `main` triggers `.github/workflows/frontend-quality.yml` which runs ESLint, TypeScript compilation (`tsc --noEmit`), and a test build.
- **Environment Variables:** Must be configured in the Vercel Dashboard (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_PORTONE_STORE_ID`).

### Backend (Supabase)
The backend (Database & Edge Functions) is deployed automatically via GitHub Actions upon merging to `main`.
- **Workflow:** `.github/workflows/supabase-deploy.yml` runs `supabase db push` and `supabase functions deploy`.
- **Requirements:** 
  - Set `SUPABASE_ACCESS_TOKEN` in GitHub Repository Secrets.
  - Set `PROJECT_ID` inside the workflow file or GitHub Secrets.
- **Edge Function Secrets:** Must be set using the Supabase CLI (`supabase secrets set`). See `.env.example` for required variables.
