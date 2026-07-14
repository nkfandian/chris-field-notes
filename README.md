# Chris / Field Notes

Full-stack personal operating system built with Next.js and Supabase.

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add Supabase values.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Create the single author account in Supabase Authentication.
5. Run `npm run dev`.

Public site: `/` · authenticated editor: `/studio`.

For Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the GA4 web stream value `NEXT_PUBLIC_GA_MEASUREMENT_ID` in all environments. Enable Web Analytics from the Vercel project's Analytics tab; the site already loads its Insights script.
