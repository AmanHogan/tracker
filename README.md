# FinTracker

Personal finance tracker built with Next.js 14, NextAuth.js, and MongoDB.

## Features

- Multi-user auth (email/password)
- Dashboard with income/expense summaries, budget vs actual charts, expense pie chart, 6-month cash flow
- Transaction management with add/edit/delete
- Fidelity CSV import — upload your Fidelity spending export and auto-categorize transactions
- Monthly budget tracking with progress bars (green/yellow/red by % used)
- Reports with weekly breakdown charts and category variance tables
- Theme support (Light, Dark, Midnight Blue)
- Mobile-responsive sidebar navigation

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Install

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```
MONGODB_URI=mongodb://localhost:27017/finance-tracker
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### Seed Demo Data

```bash
node scripts/seed.js
```

Creates a demo user (`demo@example.com` / `demo1234`) with 3 months of transactions and budgets.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Importing Fidelity Data

1. Go to **Transactions** page
2. Click **Import CSV**
3. Upload your Fidelity spending export CSV
4. Optionally filter by month
5. Transactions are auto-categorized based on Fidelity subcategories

Re-importing for the same date range replaces previous imported transactions (identified by having an account field).

## Budget Categories

Rent, Groceries, Car, Going Out, Subscriptions, Household, Utilities, Medical, Entertainment, Shopping, Other

## Tech Stack

- Next.js 14 (App Router)
- NextAuth.js (Credentials provider)
- MongoDB + Mongoose
- Tailwind CSS
- Recharts
- Lucide React icons
