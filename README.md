# Transcript Intelligence

A full-stack analytics dashboard for customer call transcripts. Surfaces competitive signals, feature gaps, customer praise, revenue risk, support trends, and rep performance from a dataset of 101 calls.

## Tech Stack

- **Frontend** — React, Vite, TanStack Query, Recharts, Tailwind CSS, shadcn/ui
- **Backend** — Node.js, Express
- **Data** — JSON transcript dataset (meeting info, summaries, speaker metadata)

## Features

| Page | Description |
|---|---|
| Dashboard | High-level overview of calls, sentiment, and account health |
| Transcripts | Searchable, filterable list of all calls with sentiment scores |
| Accounts | Account health scores, risk levels, and churn signals |
| Competitive Intelligence | Competitor mentions by account, call type, and sentiment |
| Feature Gaps | Customer-raised issues (feature gaps, concerns, technical issues) and praise from external & support calls |
| Revenue Risk | Accounts with active churn or renewal risk signals |
| Support Analytics | Rep performance, talk ratio, question rate, and call volume trends |
| Product Health | Sentiment trends, incident frequency, and product area breakdowns |
| Sentiment | Timeline and category breakdowns of customer sentiment |
| Incidents | Incident log with severity and affected accounts |

## Getting Started

### Install dependencies

```bash
npm run install:all
```

### Run in development

```bash
npm run dev
```

This starts both the Express API (port 3001) and the Vite dev server (port 5173) concurrently.

### Run individually

```bash
npm run dev:server   # API only
npm run dev:client   # Frontend only
```

## Project Structure

```
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/   # One component per route
│       ├── components/ui/  # shadcn/ui primitives
│       ├── api/     # Fetch wrappers
│       └── lib/     # Shared utilities
├── server/          # Express API
│   └── src/
│       ├── routes/  # One file per API endpoint
│       ├── lib/     # Data processing (accounts, competitors, categorization)
│       └── data/    # Transcript loader and in-memory store
└── dataset/         # Raw transcript JSON files
```
