import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatScore, formatDate, formatDuration, callTypeColor } from "@/lib/utils"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ComposedChart, ReferenceLine,
} from "recharts"
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Check, ChevronDown,
  ChevronRight, Phone, Clock, MessageSquare, Users, RefreshCw,
} from "lucide-react"

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtPct(v) { return v == null ? "—" : `${v.toFixed(0)}%` }
function fmtRate(v) { return v == null ? "—" : `${v.toFixed(1)}/hr` }
function fmtSwitches(v) { return v == null ? "—" : `${v.toFixed(1)}/5m` }
function fmtMin(v) { return v == null ? "—" : `${v.toFixed(0)}m` }

function sentimentColor(s) {
  if (s == null) return "text-muted-foreground"
  if (s >= 4) return "text-emerald-600"
  if (s >= 3) return "text-blue-600"
  if (s >= 2) return "text-amber-600"
  return "text-red-600"
}

function sentimentBg(s) {
  if (s == null) return "bg-muted text-muted-foreground"
  if (s >= 4) return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
  if (s >= 3) return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
  if (s >= 2) return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
  return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
}

// Inline SVG sparkline — no recharts overhead for tiny 80×28 charts
function Sparkline({ data, color = "#6366f1" }) {
  if (!data || data.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 0.01
  const W = 80, H = 28, pad = 3
  const pts = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (W - pad * 2)
      const y = H - pad - ((v - min) / range) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg width={W} height={H} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function TrendBadge({ direction }) {
  if (direction === "improving") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
      <TrendingUp className="h-2.5 w-2.5" /> Improving
    </span>
  )
  if (direction === "declining") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded-full">
      <TrendingDown className="h-2.5 w-2.5" /> Declining
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
      <Minus className="h-2.5 w-2.5" /> Stable
    </span>
  )
}

// ── Summary stat card ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, good, iconColor = "text-muted-foreground" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-black mt-1 tracking-tight text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-lg bg-muted flex-shrink-0", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {good != null && (
          <div className={cn("mt-3 flex items-center gap-1 text-[11px] font-semibold",
            good ? "text-emerald-600" : "text-amber-600")}>
            {good ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {good ? "Within benchmark" : "Below benchmark"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Distribution bar chart ─────────────────────────────────────────────────

const DIST_COLORS = {
  // talk ratio — green for low rep talk, red for high
  "<40%": "#34d399", "40-50%": "#60a5fa", "50-60%": "#fbbf24", "60-70%": "#f97316", ">70%": "#ef4444",
  // duration — neutral blues
  "<15m": "#bfdbfe", "15-25m": "#60a5fa", "25-35m": "#3b82f6", ">35m": "#1d4ed8",
  // q-rate — green for meeting target
  "<10/hr": "#ef4444", "10-18/hr": "#fbbf24", "18-25/hr": "#34d399", ">25/hr": "#059669",
}

function DistChart({ data, title, description, referenceLabel }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={DIST_COLORS[entry.label] || "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {referenceLabel && (
          <p className="text-[10px] text-muted-foreground text-center mt-1">{referenceLabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Rep row (expandable) ───────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "calls",      label: "Calls" },
  { value: "sentiment",  label: "Sentiment" },
  { value: "talkRatio",  label: "Talk Ratio" },
  { value: "qRate",      label: "Q/hr" },
  { value: "duration",   label: "Duration" },
]

function RepRow({ rep, isExpanded, onToggle }) {
  const talkFlag = rep.avgRepTalkPct != null && rep.avgRepTalkPct > 55
  const qFlag    = rep.avgQuestionRatePerHour != null && rep.avgQuestionRatePerHour < 18
  const sparkColor = rep.trendDirection === "improving" ? "#10b981"
    : rep.trendDirection === "declining" ? "#ef4444"
    : "#6366f1"

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left hover:bg-muted/40 transition-colors"
      >
        {/* Main rep row */}
        <div className="grid grid-cols-12 gap-3 items-center px-4 py-3">
          {/* Avatar + name */}
          <div className="col-span-3 flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {rep.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{rep.name}</p>
              <p className="text-[10px] text-muted-foreground">{rep.callCount} calls</p>
            </div>
          </div>

          {/* Avg sentiment + sparkline */}
          <div className="col-span-3 flex items-center gap-2">
            <Sparkline data={rep.sentimentHistory} color={sparkColor} />
            <div>
              <p className={cn("text-sm font-bold", sentimentColor(rep.avgSentiment))}>
                {formatScore(rep.avgSentiment)}
              </p>
              <TrendBadge direction={rep.trendDirection} />
            </div>
          </div>

          {/* Talk ratio */}
          <div className="col-span-2 text-center">
            <p className={cn("text-sm font-bold", talkFlag ? "text-red-600" : "text-foreground")}>
              {fmtPct(rep.avgRepTalkPct)}
            </p>
            {rep.callsOverThreshold > 0 && (
              <p className="text-[10px] text-amber-600">{rep.callsOverThreshold} over limit</p>
            )}
          </div>

          {/* Q/hr */}
          <div className="col-span-2 text-center">
            <p className={cn("text-sm font-bold", qFlag ? "text-amber-600" : "text-foreground")}>
              {fmtRate(rep.avgQuestionRatePerHour)}
            </p>
            {qFlag && <p className="text-[10px] text-amber-600">below 18/hr</p>}
          </div>

          {/* Duration */}
          <div className="col-span-1 text-center">
            <p className="text-sm font-semibold text-foreground">{fmtMin(rep.avgDurationMins)}</p>
          </div>

          <div className="col-span-1 flex justify-end">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform flex-shrink-0", isExpanded && "rotate-180")} />
          </div>
        </div>
      </button>

      {/* Expanded: benchmark bars + recent calls */}
      {isExpanded && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          {/* Metric benchmark bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Talk Ratio", value: rep.avgRepTalkPct, target: 55,
                format: fmtPct, good: rep.avgRepTalkPct != null && rep.avgRepTalkPct <= 55,
                bar: rep.avgRepTalkPct, barMax: 100,
                hint: "≤55% rep talk across call types",
              },
              {
                label: "Questions / hr", value: rep.avgQuestionRatePerHour, target: 18,
                format: fmtRate, good: rep.avgQuestionRatePerHour != null && rep.avgQuestionRatePerHour >= 18,
                bar: Math.min(rep.avgQuestionRatePerHour || 0, 30), barMax: 30,
                hint: "≥18/hr target",
              },
              {
                label: "Interactivity", value: rep.avgSwitchesPer5Min, target: 5,
                format: fmtSwitches, good: rep.avgSwitchesPer5Min != null && rep.avgSwitchesPer5Min >= 5,
                bar: Math.min(rep.avgSwitchesPer5Min || 0, 12), barMax: 12,
                hint: "≥5 switches/5min target",
              },
              {
                label: "Avg Duration", value: rep.avgDurationMins,
                format: fmtMin, good: null,
                bar: Math.min(rep.avgDurationMins || 0, 45), barMax: 45,
                hint: "minutes per call",
              },
            ].map(({ label, value, format, good, bar, barMax, hint }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                  {good != null && (good
                    ? <Check className="h-3 w-3 text-emerald-500" />
                    : <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <p className={cn("text-lg font-black leading-none",
                  good === true ? "text-emerald-600" : good === false ? "text-red-600" : "text-foreground"
                )}>{format(value)}</p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      good === true ? "bg-emerald-500" : good === false ? "bg-amber-500" : "bg-blue-500"
                    )}
                    style={{ width: `${barMax > 0 ? ((bar || 0) / barMax * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>

          {/* Recent calls */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Calls</p>
            <div className="space-y-1.5">
              {rep.recentCalls.map(c => (
                <Link
                  key={c.id}
                  to={`/transcripts/${c.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-card border hover:border-primary/40 hover:shadow-sm transition-all group text-sm"
                >
                  <Badge className={cn("text-[10px] flex-shrink-0", callTypeColor(c.callType))}>{c.callType}</Badge>
                  <p className="flex-1 truncate text-xs text-foreground group-hover:text-primary transition-colors">{c.title}</p>
                  <div className="flex items-center gap-3 flex-shrink-0 text-[11px] text-muted-foreground">
                    {c.customerAccount && <span className="hidden md:block">{c.customerAccount}</span>}
                    <span>{formatDate(c.date)}</span>
                    <span className={cn("font-bold", sentimentColor(c.sentimentScore))}>{formatScore(c.sentimentScore)}</span>
                    <span className={cn(c.repTalkPct > 55 ? "text-red-600 font-bold" : "")}>{fmtPct(c.repTalkPct)}</span>
                    <span className={cn(c.questionRatePerHour < 18 ? "text-amber-600" : "")}>{fmtRate(c.questionRatePerHour)}</span>
                    <span>{fmtMin(c.durationMins)}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SupportAnalytics() {
  const [sort, setSort] = useState("calls")
  const [expanded, setExpanded] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ["support-analytics"], queryFn: api.supportAnalytics })

  if (isLoading) return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-52" />)}</div>
      <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
    </div>
  )

  const { summary, weeklyTrend, talkRatioDistribution, durationDistribution, qRateDistribution, byRep } = data

  const sortedReps = [...byRep].sort((a, b) => {
    if (sort === "sentiment")  return (b.avgSentiment ?? 0) - (a.avgSentiment ?? 0)
    if (sort === "talkRatio")  return (a.avgRepTalkPct ?? 999) - (b.avgRepTalkPct ?? 999)
    if (sort === "qRate")      return (b.avgQuestionRatePerHour ?? 0) - (a.avgQuestionRatePerHour ?? 0)
    if (sort === "duration")   return (b.avgDurationMins ?? 0) - (a.avgDurationMins ?? 0)
    return b.callCount - a.callCount
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Support Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {summary.totalCalls} customer-facing calls
          {" · "}{summary.callTypeCounts.external ?? 0} external · {summary.callTypeCounts.support ?? 0} support
          {" · "}{byRep.length} reps
          {summary.dateRange && ` · ${summary.dateRange.start} – ${summary.dateRange.end}`}
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Phone}
          label="Total Calls"
          value={summary.totalCalls}
          sub={`${summary.callTypeCounts.external ?? 0} ext · ${summary.callTypeCounts.support ?? 0} support`}
          iconColor="text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Customer Sentiment"
          value={formatScore(summary.avgSentiment)}
          sub="out of 5.0"
          good={summary.avgSentiment != null && summary.avgSentiment >= 3.5}
          iconColor={sentimentColor(summary.avgSentiment)}
        />
        <StatCard
          icon={MessageSquare}
          label="Avg Question Rate"
          value={fmtRate(summary.avgQuestionRatePerHour)}
          sub="target ≥18/hr"
          good={summary.avgQuestionRatePerHour != null && summary.avgQuestionRatePerHour >= 18}
          iconColor="text-violet-600"
        />
        <StatCard
          icon={Check}
          label="Within Talk Target"
          value={`${summary.pctWithinTarget?.toFixed(0) ?? "—"}%`}
          sub={`${summary.callsWithinTarget} of ${byRep.reduce((s,r)=>s+r.callCount,0)} calls`}
          good={summary.pctWithinTarget != null && summary.pctWithinTarget >= 60}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Talk Ratio (Rep)", value: fmtPct(summary.avgRepTalkPct), sub: "target <55% for most calls", good: summary.avgRepTalkPct != null && summary.avgRepTalkPct < 55 },
          { label: "Avg Call Duration",    value: fmtMin(summary.avgDurationMins), sub: "minutes per call", good: null },
          { label: "Avg Interactivity",    value: fmtSwitches(summary.avgSwitchesPer5Min), sub: "target ≥5 switches/5min", good: summary.avgSwitchesPer5Min != null && summary.avgSwitchesPer5Min >= 5 },
          { label: "Repeat Contacts",      value: summary.repeatContactCount, sub: `accounts with 2+ calls`, good: null },
        ].map(({ label, value, sub, good }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
              <p className="text-2xl font-black mt-1 text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              {good != null && (
                <div className={cn("mt-2 flex items-center gap-1 text-[11px] font-semibold",
                  good ? "text-emerald-600" : "text-amber-600")}>
                  {good ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {good ? "On target" : "Needs attention"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend chart + Talk ratio distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly sentiment trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weekly Sentiment & Call Volume</CardTitle>
            <CardDescription>Average customer sentiment per week with call volume bars</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={weeklyTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="sentiment" domain={[1, 5]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickCount={5} />
                <YAxis yAxisId="calls" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  formatter={(v, name) => {
                    if (name === "Calls") return [v, "Calls"]
                    return [v?.toFixed(2), name]
                  }}
                />
                <Bar yAxisId="calls" dataKey="callCount" name="Calls" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
                <Line yAxisId="sentiment" type="monotone" dataKey="avgSentiment" name="Avg Sentiment" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                <ReferenceLine yAxisId="sentiment" y={3.5} stroke="#10b981" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: "Target", position: "insideTopRight", fontSize: 10, fill: "#10b981" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Talk ratio distribution */}
        <DistChart
          data={talkRatioDistribution}
          title="Talk Ratio Distribution"
          description="How much reps talked per call"
          referenceLabel="Green = under target · Red = rep over-talking"
        />
      </div>

      {/* Duration + Q-rate distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistChart
          data={durationDistribution}
          title="Call Duration Distribution"
          description="Minutes per call across all customer-facing calls"
        />
        <DistChart
          data={qRateDistribution}
          title="Question Rate Distribution"
          description="Questions per hour — target is ≥18/hr"
          referenceLabel="Red = below threshold · Green = meeting or exceeding target"
        />
      </div>

      {/* Repeat contacts alert */}
      {summary.repeatContactAccounts?.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Repeat Contact Accounts — Possible FCR Risk
            </CardTitle>
            <CardDescription>
              {summary.repeatContactCount} accounts had multiple customer-facing calls — may indicate unresolved issues from prior contacts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.repeatContactAccounts.map(({ account, count }) => (
                <Link
                  key={account}
                  to={`/accounts/${encodeURIComponent(account)}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                >
                  {account}
                  <span className="bg-amber-600 text-white text-[9px] font-bold px-1 rounded-full">{count}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rep performance table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Rep Performance</h2>
            <p className="text-xs text-muted-foreground">Sentiment trend, talk ratio, and engagement quality per rep</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                    sort === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="col-span-3">Rep</div>
          <div className="col-span-3">Sentiment Trend</div>
          <div className="col-span-2 text-center">Talk Ratio</div>
          <div className="col-span-2 text-center">Q / hr</div>
          <div className="col-span-1 text-center">Duration</div>
          <div className="col-span-1" />
        </div>

        {sortedReps.map(rep => (
          <RepRow
            key={rep.email}
            rep={rep}
            isExpanded={expanded === rep.email}
            onToggle={() => setExpanded(expanded === rep.email ? null : rep.email)}
          />
        ))}
      </div>
    </div>
  )
}
