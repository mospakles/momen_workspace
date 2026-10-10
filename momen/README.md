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

## Running it

Needs Node 20.9+ (this repo has `.nvmrc` → `nvm use`).

```bash
cp .env.example .env      # then set APP_PASSWORD and SESSION_SECRET
npm install
npm run db:migrate        # creates prisma/momen.db
npm run seed              # optional: demo data to look around
npm run dev               # http://localhost:3000
```

Use on your phone (same Wi-Fi): run `npm run dev -- -H 0.0.0.0` and open `http://<your-computer-ip>:3000`.

For everyday use run the production build: `npm run build && npm start`.

## Your data

- Everything lives in `prisma/momen.db` (SQLite) and photos in `uploads/`. Neither is committed to git.
- `npm run backup` copies both into `backups/<date>/`. Copy that folder to Google Drive or a flash drive regularly.
- `npm run db:studio` opens a spreadsheet-like view of the raw data.
- `npm run db:reset` **wipes everything** (handy after trying the demo data).

## Hosting online later

SQLite + local photo files suit a single computer or a small VPS. To host on Vercel or similar,
switch `provider` in `prisma/schema.prisma` to `postgresql` (e.g. Neon or Supabase) and move photo
storage to a bucket (S3, Cloudflare R2, Vercel Blob) in `src/actions/orders.ts`.
