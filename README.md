# essora-co

Backbone for a college essay feedback platform that connects student applicants
with reviewers. Plain black-and-white, structure only.

## Structure

- `src/pages/` — each page of the site as its own JSX file (`Login.jsx`, `SignUp.jsx`)
- `src/app/` — `App.jsx`, the shell that holds the site together and handles
  navigation between pages (React Router)
- `src/main.jsx` — entry point that mounts the app
- `src/styles.css` — plain black-and-white styles
- `index.html` — mount point only

## Run it locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Pages

- `/login` — email + password
- `/signup` — name, email, password, and whether you are an applicant or a reviewer
