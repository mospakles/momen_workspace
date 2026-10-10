# Momen — shop manager

A private web app for running the Momen shop day to day: customers, measurements, orders,
payments and promises to pay, outfit costs (tailor, embroidery, button holes…), shop
expenses, fitting photos, to-dos, issues and monthly profit & loss.

## What's where

| Page | What it's for |
| --- | --- |
| **Today** | Overdue & due-this-week orders, today's to-dos, payment promises coming due, fittings, money in/out today |
| **Orders** | Every outfit. Filter by in progress / overdue / owing / delivered. Each order holds payments, promises, costs, photos, fit comments, problems, tasks and early/late delivery |
| **Customers** | Full record of each customer: contact, notes, measurement history, orders, what they've paid and owe, fit comments, issues |
| **Expenses** | Shop spending not tied to one outfit. "Day-to-day" vs "Big buy" (machines, equipment) |
| **To-do** | Daily task list, optionally linked to an order |
| **Issues** | Anything that went wrong and how it was resolved |
| **Reports** | Monthly statement: income, cost of making outfits, gross profit, running expenses, net profit, big buys, deliveries (early/late), profit per outfit, who owes you, 12-month trend. Printable |

**Where to put a cost:** if it's for one specific outfit (paying the tailor, embroidery, button holes,
fabric you bought for that order), add it on the **order** so you see that order's profit. General
stock and running costs (rent, fuel, a roll of lining for many outfits, a new machine) go in **Expenses**.

## How it runs

One Next.js app: the pages *and* the backend (server actions that save data, the photo API, login)
deploy together to **Vercel** as serverless functions — there is no separate server to run.

- **Database:** Postgres on Neon (Vercel Marketplace), region Frankfurt. `DATABASE_URL` (pooled) and
  `DATABASE_URL_UNPOOLED` (for migrations) are added to the Vercel project automatically.
- **Photos:** private Vercel Blob store `momen-photos`. Photos are shrunk in the browser before upload
  and are only viewable through `/api/photos/…` after logging in. Without `BLOB_READ_WRITE_TOKEN`
  (e.g. local dev) they're saved to `./uploads` instead.
- **Login:** `APP_PASSWORD` and `SESSION_SECRET` are set in Vercel → Project → Settings → Environment Variables.
- **Timezone:** `APP_TIMEZONE` (default `Africa/Lagos`) so "today" and month boundaries match the shop.

## Deploying

Every deploy runs `npm run vercel-build` = `prisma generate && prisma migrate deploy && next build`,
so database changes in `prisma/migrations` are applied automatically.

```bash
vercel --prod        # from this folder; or connect a GitHub repo in Vercel for deploy-on-push
```

## Local development

Needs Node 20.9+ (`nvm use`).

```bash
npm install
vercel env pull .env  # downloads DATABASE_URL etc. from Vercel (asks once to log in)
npm run dev           # http://localhost:3000
```

⚠️ The pulled `DATABASE_URL` is your **real** shop database. For experiments, create a branch in the
Neon console and use its URLs instead.

## Your data

- `npm run backup` exports every table to `backups/momen-<date>.json`. Do it regularly and keep a copy
  on Google Drive or a flash drive. Neon also keeps point-in-time history (restore window depends on plan).
- `npm run db:studio` opens a spreadsheet-like view of the raw data.
- `npm run seed` adds demo data — only use it on a test branch, never the real database.
