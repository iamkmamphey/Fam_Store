# Fam Store (Famyank POS & Inventory)

Single-page POS + inventory app built with React + Vite.

## Run locally

1. Install dependencies:
   `npm install`
2. Start dev server:
   `npm run dev`

## Security notes (important)

- **Passwords**: staff passwords are stored **hashed + salted** in browser storage (PBKDF2). There is **no backend** in this repo, so treat this as a demo/offline tool.
- **AI Smart Scan (Gemini)**: if you configure `GEMINI_API_KEY`, it will be **bundled into the frontend** and therefore **public to anyone who can load the site**.
  - For real deployments, **do not ship API keys in the browser**. Use a server-side proxy/service instead.
