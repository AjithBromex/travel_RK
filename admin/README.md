# RK Travel Hub – Admin (Next.js 14, App Router)

## Run
    npm install
    cp .env.example .env.local   # set ADMIN_USER, ADMIN_PASS, ADMIN_SESSION_SECRET
    npm run dev                  # http://localhost:3000/admin

## Pages
/admin (dashboard) · /admin/users · vehicles · trips · payments · expenses · cashbook · reminders

## Add or change a module
Edit `lib/modules.js` – fields, table columns and API routes all come from it.

## Connect your real database
`lib/store.js` is in-memory (resets on restart). Replace `listRows`, `createRow`,
`updateRow`, `deleteRow` with Prisma/Mongo/Supabase calls. Nothing else changes.
If your main site already uses NextAuth, swap `middleware.js` for its session check.
