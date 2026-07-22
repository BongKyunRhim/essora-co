# essora-co

Backbone for a college essay feedback platform that connects student applicants
with reviewers. Plain black-and-white, structure only.

## Structure

- `src/pages/` — each page of the site as its own JSX file
  - `Login.jsx`, `SignUp.jsx` — accounts (Supabase auth)
  - `Dashboard.jsx` — signpost that routes each user to the right home by role
  - `ReviewerHome.jsx` — a reviewer posts their info and sets a price
  - `ApplicantHome.jsx` — an applicant browses the list of reviewers
- `src/app/` — `App.jsx` (shell + routes) and `AuthContext.jsx` (who's logged in)
- `src/lib/` — `supabase.js` (database/auth client) and `config.js` (your keys)
- `supabase/schema.sql` — run once to create the database table + rules

## Connecting storage (Supabase) — one-time setup

1. Create a free account at https://supabase.com and make a new project.
2. In the project: **SQL Editor → New query**, paste all of `supabase/schema.sql`,
   and click **Run**. This creates the `profiles` table.
3. (For easy testing) **Authentication → Providers → Email**, turn **off**
   "Confirm email" so new accounts can log in immediately.
4. **Project Settings → API**, copy the **Project URL** and the **anon public**
   key, and paste them into `src/lib/config.js`.
5. Commit — the live site redeploys automatically.

The anon key is safe to commit publicly: it's meant for the browser, and the
database rules (Row Level Security) control what each user can see.

## Run it locally

```bash
npm install
npm run dev
```

## How roles work

At sign up, a user picks **Applicant** or **Reviewer**. That choice is stored on
their profile and decides where the dashboard sends them:

- **Reviewer** → posts a bio and a price per essay.
- **Applicant** → sees the list of reviewers and their prices.
