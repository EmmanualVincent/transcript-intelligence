# Transcript Intelligence — Technical Spec

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev server, modern defaults |
| Routing | React Router v6 | Standard SPA routing |
| Data fetching | TanStack Query (React Query) | Caching, loading states, refetch |
| Charts | Recharts | Composable, React-native, no canvas boilerplate |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, pre-built accessible components |
| Backend | Node.js + Express | Straightforward REST, ecosystem |
| Data layer | In-memory (startup parse) | Dataset is 2.4 MB — no database needed |
| Dev tooling | Concurrently + nodemon | Single `npm run dev` starts both servers |

---

## Repository Structure

```
interview-assignment/
├── dataset/                    # 101 raw transcript folders (read-only)
├── server/
│   ├── src/
│   │   ├── index.js            # Express app + server entry
│   │   ├── data/
│   │   │   └── loader.js       # Parse all 101 folders into memory on startup
│   │   ├── lib/
│   │   │   ├── categorize.js   # Rule-based + topic categorization logic
│   │   │   ├── accounts.js     # Account health score computation
│   │   │   └── competitors.js  # Competitor mention extraction
│   │   └── routes/
│   │       ├── overview.js
│   │       ├── transcripts.js
│   │       ├── sentiment.js
│   │       ├── accounts.js
│   │       └── competitive.js
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/                # One file per backend route group
│   │   │   ├── overview.js
│   │   │   ├── transcripts.js
│   │   │   ├── sentiment.js
│   │   │   ├── accounts.js
│   │   │   └── competitive.js
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transcripts.jsx
│   │   │   ├── TranscriptDetail.jsx
│   │   │   ├── Sentiment.jsx
│   │   │   ├── Accounts.jsx
│   │   │   ├── AccountDetail.jsx
│   │   │   └── Competitive.jsx
│   │   └── components/
│   │       ├── layout/
│   │       │   ├── Sidebar.jsx
│   │       │   └── TopBar.jsx
│   │       ├── charts/
│   │       │   ├── SentimentTimeline.jsx
│   │       │   ├── SentimentByCallType.jsx
│   │       │   ├── CategoryBreakdown.jsx
│   │       │   └── AccountHealthBar.jsx
│   │       └── ui/             # shadcn/ui components live here
│   ├── index.html
│   └── package.json
├── PLAN.md
├── SPEC.md
└── package.json                # Root: runs both server + client
```

---

## Data Models

### Transcript (built at startup from raw files)

```js
{
  id: "01KQ03B0303900521BB089CA",           // folder name
  title: "Detect Outage - Remediation Plan Review",
  startTime: "2026-03-16T09:30:00.000Z",
  endTime:   "2026-03-16T10:05:12.000Z",
  duration: 35.2,                           // minutes
  organizerEmail: "megan.lawson@aegiscloud.com",
  allEmails: ["megan.lawson@aegiscloud.com", ...],

  // derived
  callType: "internal" | "external" | "support",
  category: "incident" | "renewal" | "compliance" | "support" | "product" | "competitive" | "onboarding" | "ops",
  customerAccount: "Meridian Capital" | null,  // null for internal calls

  // from summary.json
  summary: "...",
  actionItems: ["...", "..."],
  topics: ["outage remediation", "incident response", ...],
  overallSentiment: "mixed-negative",
  sentimentScore: 2.4,
  keyMoments: [
    {
      time: 95.0,
      text: "Brian reveals 112 open support tickets...",
      type: "churn_signal",
      speaker: "Brian Cho"
    }
  ],

  // from transcript.json
  utterances: [
    {
      index: 0,
      speaker: "Megan Lawson",
      sentence: "Alright, I think we're all on...",
      time: 7.4,
      endTime: 12.6,
      sentimentType: "neutral",
      confidence: 0.97
    }
  ],

  speakers: ["Megan Lawson", "Raj Kapoor", "Brian Cho"]
}
```

### AccountHealth (computed at startup)

```js
{
  name: "Meridian Capital",
  riskScore: 0–100,          // higher = more at risk
  riskLevel: "critical" | "high" | "medium" | "low",
  transcriptCount: 4,
  avgSentimentScore: 2.1,
  churnSignalCount: 3,
  competitorMentionCount: 2,
  featureGapCount: 1,
  hasUpcomingRenewal: true,
  lastCallDate: "2026-04-02",
  transcriptIds: ["...", "..."],
  competitors: ["SentinelShield"],
  topConcerns: ["service reliability", "sla breach", "compliance"]
}
```

### CompetitorInsight (computed at startup)

```js
{
  name: "SentinelShield",
  mentionCount: 18,
  callTypes: { internal: 6, external: 9, support: 3 },
  affectedAccounts: ["Northstar Pharma", "Crestwood Health", ...],
  contexts: [
    {
      transcriptId: "...",
      transcriptTitle: "ESCALATION: Northstar Pharma...",
      momentText: "Frank states he is actively evaluating...",
      sentimentScore: 1.6
    }
  ],
  avgSentimentAtMention: 2.1   // calls where this competitor appears are more negative
}
```

---

## Backend API

Base URL: `http://localhost:3001/api`

All responses are JSON. No auth for this build.

### `GET /api/overview`
Returns dashboard summary stats.

```json
{
  "totalTranscripts": 101,
  "callTypeBreakdown": { "internal": 30, "external": 41, "support": 30 },
  "categoryBreakdown": { "incident": 12, "renewal": 20, ... },
  "avgSentimentByCallType": { "internal": 3.1, "external": 3.7, "support": 2.6 },
  "totalChurnSignals": 61,
  "totalFeatureGaps": 51,
  "criticalAccounts": 5,
  "competitorsDetected": ["SentinelShield", "CyberNova", "Wiz"],
  "dateRange": { "start": "2026-02-03", "end": "2026-04-28" }
}
```

### `GET /api/transcripts`
Query params: `callType`, `category`, `account`, `sentiment`, `search`, `page`, `limit`

```json
{
  "transcripts": [ /* Transcript objects (without utterances for list view) */ ],
  "total": 101,
  "page": 1,
  "limit": 20
}
```

### `GET /api/transcripts/:id`
Returns full Transcript object including utterances array.

### `GET /api/sentiment/timeline`
Returns sentiment scores grouped by week for charting.

```json
{
  "weeks": [
    {
      "weekStart": "2026-02-03",
      "avgScore": 3.8,
      "byCallType": { "internal": 3.9, "external": 4.1, "support": 3.2 },
      "transcriptCount": 8
    }
  ]
}
```

### `GET /api/sentiment/by-category`
Returns avg sentiment score per category and per call type.

```json
{
  "byCategory": { "incident": 2.2, "renewal": 3.4, "compliance": 3.9, ... },
  "byCallType": { "internal": 3.1, "external": 3.7, "support": 2.6 }
}
```

### `GET /api/sentiment/by-topic`
Returns top 15 topics with their avg sentiment score and call count.

### `GET /api/accounts`
Query params: `riskLevel`, `sort` (`riskScore` | `lastCall` | `name`)

```json
{
  "accounts": [ /* AccountHealth objects */ ]
}
```

### `GET /api/accounts/:name`
Returns single AccountHealth with full `transcriptIds` joined to transcript summaries.

### `GET /api/competitive`
Returns all CompetitorInsight objects.

### `GET /api/competitive/:name`
Returns single competitor with full context list.

### `GET /api/incidents`
Returns the incident thread — all transcripts related to the Detect Outage in chronological order, with a `threadRole` label (e.g., `"war_room"`, `"remediation"`, `"customer_escalation"`, `"postmortem"`).

### `GET /api/features`
Returns aggregated feature gaps grouped by product area with account names.

```json
{
  "gaps": [
    {
      "area": "Identity",
      "topic": "SCIM provisioning",
      "mentions": 4,
      "accounts": ["Meridian Capital", "Crestline Wealth"],
      "moments": [ { "text": "...", "transcriptTitle": "..." } ]
    }
  ]
}
```

---

## Frontend Pages

### `/` — Dashboard
- Stat cards: total calls, churn signals, critical accounts, competitors detected
- Mini charts: call type donut, sentiment by call type bar
- Alert strip: top 3 at-risk accounts
- Quick link to the Incident Thread view

### `/transcripts` — Transcript Explorer
- Filter bar: call type, category, sentiment range, account, text search
- Table/card list with: title, call type badge, category badge, sentiment score chip, date, duration
- Click row → `/transcripts/:id`

### `/transcripts/:id` — Transcript Detail
- Header: title, metadata, sentiment score
- Summary section
- Key Moments timeline (visual scrubber showing churn_signal, feature_gap etc. as markers)
- Action Items list
- Full transcript with sentence-level sentiment coloring (red/grey/green)
- Speaker talk time breakdown

### `/sentiment` — Sentiment Analysis
- Line chart: sentiment over time (Feb–Apr), toggleable by call type
- Sentiment distribution histogram
- Heatmap or table: sentiment by category × call type
- The AM divergence insight: side-by-side external vs support avg sentiment per account

### `/accounts` — Account Health
- Sortable/filterable table: account name, risk score bar, churn signals, avg sentiment, last call, upcoming renewal flag
- Risk level filter chips: Critical / High / Medium / Low
- Click row → `/accounts/:name`

### `/accounts/:name` — Account Detail
- Health score breakdown (how score is computed, each contributing factor)
- Timeline of all calls with that account (sentiment dots per call)
- Key moments from all calls
- Competitor mentions
- Feature gaps raised

### `/competitive` — Competitive Intelligence
- Cards per competitor: mention count, affected accounts, avg call sentiment at mention
- Click competitor → filtered transcript list + top quote moments

---

## Account Risk Score Algorithm

```
riskScore = 0

// Churn signals are the strongest predictor
churnSignalCount >= 3  → +40
churnSignalCount == 2  → +25
churnSignalCount == 1  → +15

// Low sentiment amplifies risk
avgSentimentScore < 2.0  → +20
avgSentimentScore < 2.5  → +15
avgSentimentScore < 3.0  → +10

// Competitor evaluation is a late-stage warning
competitorMentionCount >= 2  → +25
competitorMentionCount == 1  → +15

// Upcoming renewal creates urgency
hasUpcomingRenewal  → +10

// Feature gaps indicate unmet needs
featureGapCount >= 3  → +5

riskScore = min(riskScore, 100)
riskLevel:
  80–100 → critical
  60–79  → high
  40–59  → medium
  0–39   → low
```

---

## Categorization Logic

Implemented in `server/src/lib/categorize.js`.

**Step 1 — Call type (email-based, deterministic):**
```
all emails @aegiscloud.com only → internal
title starts with "Support Case #" → support
otherwise → external
```

**Step 2 — Category (title pattern matching, then topic fallback):**
```
title matches /outage|incident|war room|escalation|remediation|root cause/i → incident
title matches /renewal|contract|annual review|multi-year/i                  → renewal
title matches /onboarding|kickoff|deployment|setup/i                        → onboarding
title matches /competitive|win.?loss/i                                      → competitive
title matches /sprint|roadmap|launch|design review|retro|standup|all hands/i → product
title starts with "Support Case #"                                          → support (already set)

fallback (topic-based):
  topics include soc 2|iso 27001|hipaa|pci dss|compliance audit → compliance
  else → ops
```

---

## Competitor Extraction Logic

Implemented in `server/src/lib/competitors.js`.

On startup, for each transcript scan `summary + keyMoments text` for known competitor names (case-insensitive):
- SentinelShield
- CyberNova
- Wiz
- VaultGuard
- CrowdStrike
- Splunk

Build index: competitor → list of `{ transcriptId, momentText, sentimentScore, account }`.

To surface new competitors not in the hardcoded list: flag any capitalized proper noun appearing within 10 words of "competitor", "evaluating", "comparing", "switching to" in the transcript utterances. Return these as `unrecognized_competitor` candidates for manual review.

---

## Incident Thread Construction

In `server/src/routes/incidents.js`:

1. Find all transcripts where `category === "incident"` OR title contains `/detect outage|detect pipeline/i`
2. Sort by `startTime`
3. Assign `threadRole` by title pattern:
   - "War Room" → `war_room`
   - "Remediation" → `remediation`
   - "Escalation Bridge" / "URGENT" / "ESCALATION:" → `escalation`
   - "Customer Impact" → `customer_impact`
   - "Post-Incident" / "Root Cause" / "30-Day Review" → `postmortem`
   - Customer calls (external) matching the thread → `customer_impact`

---

## Dev Setup

**Root `package.json`:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "install:all": "npm i && npm i --prefix server && npm i --prefix client"
  }
}
```

**Server** runs on port `3001`, dataset path resolved via env var:
```
DATASET_PATH=../dataset
```

**Client** Vite dev server runs on port `5173`, proxies `/api` to `localhost:3001`:
```js
// vite.config.js
server: { proxy: { '/api': 'http://localhost:3001' } }
```

---

## Key Dependencies

**Server:**
```
express
cors
dotenv
```

**Client:**
```
react react-dom
react-router-dom
@tanstack/react-query
recharts
tailwindcss
@shadcn/ui (components: card, badge, button, table, tabs, skeleton)
```

---

## Build Order

Build in this exact order — each phase is independently demostrable:

**Phase 1 — Data Foundation (backend only)**
1. `server/src/data/loader.js` — parse all 101 folders into memory
2. `server/src/lib/categorize.js` — apply call type + category labels
3. `GET /api/overview` + `GET /api/transcripts` — verify categorization output

**Phase 2 — Sentiment (backend + frontend)**
4. `GET /api/sentiment/timeline` + `GET /api/sentiment/by-category`
5. `SentimentTimeline.jsx` chart + `Sentiment` page

**Phase 3 — Account Health (backend + frontend)**
6. `server/src/lib/accounts.js` — score all accounts
7. `GET /api/accounts` + `GET /api/accounts/:name`
8. `Accounts` page + `AccountDetail` page

**Phase 4 — Competitive Intelligence**
9. `server/src/lib/competitors.js` — build competitor index
10. `GET /api/competitive` + `Competitive` page

**Phase 5 — Transcript Explorer + Detail**
11. `Transcripts` page with filters
12. `TranscriptDetail` page with key moments timeline + utterance coloring

**Phase 6 — Dashboard + Polish**
13. `Dashboard` page pulling from `/api/overview`
14. Sidebar navigation, responsive layout, loading skeletons

---

## What Each Stakeholder Sees

| Stakeholder | Primary Page | Key Value |
|---|---|---|
| Sales / CSM | Accounts | Risk score, churn signals, upcoming renewals |
| Support Leader | Transcripts (support filter) | Volume trends, escalation patterns |
| Product Manager | Transcripts (feature_gap moments) | Customer-validated backlog |
| Engineering Lead | Incidents thread | Outage timeline, postmortem trail |
| Executive | Dashboard | One-screen health of all 101 calls |
| Competitive Intel | Competitive | Who is being evaluated and why |
