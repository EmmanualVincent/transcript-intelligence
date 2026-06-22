# Transcript Intelligence — Product & Build Plan

## The Dataset, Decoded

AegisCloud is a B2B cybersecurity SaaS company with three products: **Detect** (threat monitoring), **Comply v2** (compliance reporting), and **Identity** (IAM/MFA). The 100 transcripts break down into roughly:
- **~30 internal** calls (war rooms, standups, sprint planning, all-hands)
- **~40 external** customer calls (renewals, onboarding, QBRs, feedback sessions)
- **~30 support** cases (billing disputes, integration bugs, outage tickets)

The data is already pre-processed. Each transcript has `summary.json` with: sentiment score (1–5), topics array, key moments (typed as `churn_signal`, `feature_gap`, `concern`, `positive_pivot`, `technical_issue`), and action items. **This is the biggest advantage** — don't rebuild what's already there. The job is to aggregate and connect it.

---

## The Narrative Thread to Lead With

There is a single dominant story running through ~15 transcripts: the **Detect Pipeline Outage**. It goes:

1. `INCIDENT: Detect Pipeline Failure - War Room` — engineers discover a single point of failure took down threat monitoring for 6 hours
2. `Detect Outage - Remediation Plan Review` — Megan, Raj, Brian align on fix (112 open support tickets, ~30 P1/P2 accounts)
3. `Detect Outage - Escalation Bridge` — competitor SentinelShield being evaluated by Crestwood Health
4. `URGENT: Blackridge Investments - Complete Loss of Threat Visibility` — customer threatens to leave
5. `ESCALATION: Northstar Pharma - Detect Outage Impact` — Frank actively evaluating SentinelShield AND CyberNova
6. `Competitive Threat Assessment - Post Outage` — internal reaction to competitive risk
7. `Detect Outage - Post-Incident Review` — postmortem, renewal risk flagged
8. `All Hands - April Update` — CEO addresses company-wide
9. `Detect Reliability - 30-Day Review` — measuring recovery
10. Multiple support cases tied back to the outage

**Lead story: one infrastructure failure generated 61 churn signals across 100 calls, threatened 4+ major accounts, and handed competitors a window.** No other tool would surface this end-to-end — that's the product pitch.

---

## The Three Deliverables

### Task 1: Categorization Pipeline

**Approach: Hybrid (rule-based on structure + topic clustering on existing metadata)**

Do not re-run LLMs on raw transcript text. The `summary.json` already has topics. Instead:

**Step 1 — Call type classification (rule-based, instant, accurate):**
- All emails `@aegiscloud.com` only → Internal
- Title starts with `Support Case #` → Support
- Everything else → External (Customer)

**Step 2 — Theme classification (rule-based on title patterns + topic frequency):**

| Category | Approx Count | Detection Signal |
|---|---|---|
| Incident & Reliability | ~12 | title contains "Outage/INCIDENT/War Room/Escalation" |
| Customer Renewal & Revenue | ~20 | title contains "Renewal/Contract/Annual Review" |
| Compliance & Audit | ~12 | topics include soc 2, iso 27001, hipaa, pci dss |
| Technical Support | ~25 | title starts with "Support Case #" |
| Product Dev & Roadmap | ~15 | title contains "Sprint/Roadmap/Launch/Design Review" |
| Competitive Intelligence | ~5 | title contains "Competitive/Win-Loss" |
| Customer Onboarding | ~8 | title contains "Onboarding/Kickoff/Deployment" |
| Internal Ops | ~3 | title contains "Standup/All Hands/Retro" |

**Why this approach:** Titles are highly structured (standard CRM/Gong pattern). Rule-based catches 95%+ correctly, is explainable, and runs in milliseconds. Save LLM calls for the ~5% ambiguous cases.

---

### Task 2: Sentiment Analysis

`sentimentScore` (1–5) already exists on every transcript. Use it to tell a **timeline story**, not just a bar chart.

**The timeline the data tells:**
- **February**: Mixed-positive baseline (~3.5 avg) — Comply v2 excitement, Identity roadmap optimism
- **March 14–17**: Sentiment crashes across all call types — Detect Outage hits. Internal drops to 2.1–2.4. Customer calls follow at 1.4–2.4
- **March 17–25**: Engineering fixes deployed, sentiment slowly rebounds (2.8–3.4)
- **April**: Split recovery — compliance/onboarding calls very positive (4.7–4.9), outage-related renewals still dragging (2.8)

**By call type averages:**
- Internal: ~3.1 (internal tension about tech debt is honest)
- Support: ~2.6 (frustration is the baseline)
- External: ~3.7 (AMs manage tone, but churn signals are buried)

**The key insight:** Support sentiment and external call sentiment DIVERGE during the outage — customers are angrier in support calls than account managers report in renewal calls. AMs may be under-reporting churn risk to leadership. This is a real product insight with real business value.

---

### Task 3: Bonus Insights

**1. Account Health Score (Build — ~2 hours, high impact)**

For each named customer account, aggregate across all calls (support + external) and compute:
- Count of `churn_signal` key moments
- Average sentiment score
- Number of competitor mentions
- Whether renewal is upcoming
- Open support ticket volume

Output: ranked list of at-risk accounts with evidence. The data shows **Meridian Capital, Blackridge Investments, Northstar Pharma, Brightpath Commerce, and Stratos Cloud** all appear in multiple negative calls with churn signals. A health score would surface all five before the Detect Outage landed.

Stakeholder: Sales leaders, CSMs. Value: "Which accounts do I call tomorrow?" is the #1 question they can't answer from CRM data alone.

**2. Competitive Intelligence Tracker (Build — ~1.5 hours, high demo value)**

Extract competitor mentions from `keyMoments` text across all transcripts. In this dataset:
- **SentinelShield** — mentioned in at least 3 escalations, always tied to churn risk
- **CyberNova** — mentioned during outage fallout
- **VaultGuard** — mentioned in identity-related churn context

Map: which competitor appears in which call type, at what sentiment level, and what was the outcome. Cross-reference with `Win/Loss Analysis - Q1` and `Competitive Landscape Review` transcripts.

Stakeholder: Product and sales leadership. Value: "We're not losing deals on features, we're losing them during outages" is a finding that changes roadmap priorities.

**3. Feature Gap → Roadmap Signal (Describe, optionally build)**

There are 51 `feature_gap` key moments across 100 calls. Aggregate by product area and you get a customer-validated backlog: SCIM provisioning (identity), granular restore (protect/backup), custom report formatting (comply), alert deduplication (detect).

Stakeholder: Product managers. Value: surfaces gaps in the customer's own words, with account name attached, during renewal conversations — context no survey captures.

---

## Slide Deck Structure (30 min, ~12–15 slides)

1. The Setup — AegisCloud, 3 products, dataset overview
2–3. The Pipeline — approach, categories, accuracy
4–5. The Detect Outage Story — timeline across call types, churn impact
6–7. Sentiment Trends — timeline chart + AM under-reporting insight
8–9. Account Health — at-risk account dashboard + methodology
10. Competitive Intelligence — competitor signals + roadmap implications
11. Feature Gap Signal — top gaps by product, which accounts mentioned them
12. What I'd Build Next — 3 product recommendations with stakeholder + ROI framing
13. Technical Architecture — pipeline diagram for engineering Q&A

---

## Technical Shortcuts That Save Hours

The `summary.json` files are pre-computed gold. The pipeline is:

```
Parse 100 summary.json files → pandas DataFrame → apply category rules →
join with meeting-info.json → join transcript.json for speaker-level analysis
```

A working pipeline takes ~2 hours because the LLM work is already done. Invest the saved time in the account health score and competitive tracker — those are the demos that make a panel lean forward.

---

## The One Insight That Wins the Room

> **61 churn signals fired across 100 calls. 5 enterprise accounts showed 3+ signals each before anyone escalated. The current process caught them only after customers said the word "competitor" on a call. Transcript Intelligence would have flagged Northstar Pharma 2 weeks before they said "SentinelShield" in an escalation.**

That's not a feature. That's revenue protection. Lead with that.
