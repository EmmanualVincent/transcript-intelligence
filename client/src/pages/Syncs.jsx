import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatScore, formatDate } from "@/lib/utils"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Users, AlertTriangle, ClipboardList, TrendingUp, ChevronRight, Hash } from "lucide-react"

const WEEK_LABELS = {
  "2026-02-02": "Feb W1", "2026-02-09": "Feb W2", "2026-02-16": "Feb W3", "2026-02-23": "Feb W4",
  "2026-03-02": "Mar W1", "2026-03-09": "Mar W2", "2026-03-16": "Mar W3", "2026-03-23": "Mar W4",
  "2026-03-30": "Apr W1", "2026-04-06": "Apr W2", "2026-04-13": "Apr W3", "2026-04-20": "Apr W4",
}
function weekLabel(d) { return WEEK_LABELS[d] || d?.slice(5) || d }

const CATEGORY_COLORS = {
  product:     "bg-indigo-100 text-indigo-700 border-indigo-200",
  incident:    "bg-red-100 text-red-700 border-red-200",
  ops:         "bg-amber-100 text-amber-700 border-amber-200",
  competitive: "bg-violet-100 text-violet-700 border-violet-200",
  compliance:  "bg-teal-100 text-teal-700 border-teal-200",
}

const MOMENT_LABELS = {
  concern: "Concern",
  technical_issue: "Technical Issue",
}

function sentimentColor(s) {
  if (s == null) return "text-muted-foreground"
  if (s >= 4) return "text-emerald-600"
  if (s >= 3) return "text-blue-600"
  if (s >= 2) return "text-amber-600"
  return "text-red-600"
}

function sentimentBg(s) {
  if (s == null) return "bg-muted text-muted-foreground border-border"
  if (s >= 4) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (s >= 3) return "bg-blue-50 text-blue-700 border-blue-200"
  if (s >= 2) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-red-50 text-red-700 border-red-200"
}

function StatCard({ icon: Icon, label, value, sub, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("text-3xl font-bold mt-1 tracking-tight", color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-lg bg-muted", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Syncs() {
  const { data, isLoading } = useQuery({ queryKey: ["syncs"], queryFn: api.syncs })

  if (isLoading) return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
    </div>
  )

  const {
    total, avgSentiment, concernCount, actionItemCount,
    sentimentTimeline = [], recurringTopics = [], blockers = [],
    topParticipants = [], syncs = [], categoryBreakdown = {},
  } = data

  const timelineWeeks = sentimentTimeline.map(w => ({ ...w, label: weekLabel(w.weekStart) }))

  // Compute min/max for sparkline annotation
  const minWeek = timelineWeeks.reduce((m, w) => (!m || w.avgScore < m.avgScore ? w : m), null)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Engineering Syncs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total} internal calls — recurring blockers, team health, and decision tracking
        </p>
      </div>

      {/* Alert if team health is low */}
      {avgSentiment < 3 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Team health below threshold</p>
            <p className="text-sm text-red-700 mt-0.5">
              Average internal sentiment is {formatScore(avgSentiment)}/5 — significantly below healthy range (≥ 3.5).
              This correlates with the incident period and warrants a follow-up retro.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Avg Team Sentiment" value={formatScore(avgSentiment)} sub="Across all internal calls" color={sentimentColor(avgSentiment)} />
        <StatCard icon={Users} label="Internal Calls" value={total} sub="Engineering syncs & standups" />
        <StatCard icon={AlertTriangle} label="Blocker Signals" value={concernCount} sub="Concerns + technical issues" color="text-amber-600" />
        <StatCard icon={ClipboardList} label="Action Items" value={actionItemCount} sub="Commitments made in syncs" />
      </div>

      {/* Team health trend */}
      <Card>
        <CardHeader>
          <CardTitle>Team Health Over Time</CardTitle>
          <CardDescription>
            Weekly avg sentiment from internal calls only · Feb – Apr 2026
            {minWeek && (
              <span className="ml-2 text-red-600 font-medium">
                · Low point: {minWeek.label} ({formatScore(minWeek.avgScore)})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineWeeks} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickCount={5} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                formatter={(v) => [v?.toFixed(2), "Avg Sentiment"]}
              />
              {/* Healthy baseline reference band */}
              <Line
                type="monotone" dataKey={() => 3.5}
                stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3"
                dot={false} name="Healthy baseline" legendType="none"
              />
              <Line
                type="monotone" dataKey="avgScore"
                stroke="#6366f1" strokeWidth={2.5}
                dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }}
                name="Internal Sentiment"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2 pl-1">Dashed line = healthy baseline (3.5)</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recurring blockers / topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Recurring Topics
            </CardTitle>
            <CardDescription>Topics surfaced across 2+ engineering syncs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recurringTopics.map(({ topic, count, examples }) => (
              <div key={topic} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{topic}</p>
                  {examples[0] && (
                    <p className="text-xs text-muted-foreground truncate">{examples[0].title}</p>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0",
                  count >= 4 ? "bg-red-50 text-red-700 border-red-200"
                    : count >= 3 ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-muted text-muted-foreground border-border"
                )}>
                  {count}×
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top participants + category breakdown */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Most Active Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topParticipants.map(({ name, count }, i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-sm text-foreground flex-1">{name}</span>
                  <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-400"
                      style={{ width: `${(count / topParticipants[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{count} calls</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sync Types</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium", CATEGORY_COLORS[cat] || "bg-muted text-muted-foreground border-border")}>
                  <span className="capitalize">{cat}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Blocker signals */}
      {blockers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Blocker Signals from Syncs
            </CardTitle>
            <CardDescription>Concerns and technical issues raised inside engineering calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockers.map((m, i) => (
              <Link
                key={i}
                to={`/transcripts/${m.transcriptId}`}
                className="group flex items-start gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/40 transition-all"
              >
                <div className={cn(
                  "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
                  m.type === "technical_issue" ? "bg-red-500" : "bg-amber-500"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">{m.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className={cn("text-[10px]", m.type === "technical_issue" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                      {MOMENT_LABELS[m.type]}
                    </Badge>
                    {m.date && <span className="text-[10px] text-muted-foreground">{formatDate(m.date)}</span>}
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px] group-hover:text-primary transition-colors">
                      {m.transcriptTitle}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sync list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>All Engineering Syncs</CardTitle>
          <CardDescription>{total} internal calls</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {syncs.map(sync => (
              <Link
                key={sync.id}
                to={`/transcripts/${sync.id}`}
                className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {sync.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{formatDate(sync.date)}</span>
                    <span className="text-xs text-muted-foreground">{sync.speakerCount} participants</span>
                    {sync.concernCount > 0 && (
                      <span className="text-xs text-amber-600 font-medium">{sync.concernCount} blocker{sync.concernCount !== 1 ? 's' : ''}</span>
                    )}
                    {sync.topics.slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground capitalize">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge className={cn("text-[10px] border", CATEGORY_COLORS[sync.category] || "bg-muted border-border text-muted-foreground")}>
                    {sync.category}
                  </Badge>
                  <span className={cn("text-sm font-bold px-2 py-0.5 rounded border", sentimentBg(sync.sentimentScore))}>
                    {formatScore(sync.sentimentScore)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
