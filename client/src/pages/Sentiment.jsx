import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatScore } from "@/lib/utils"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts"
import { AlertTriangle, ArrowUp } from "lucide-react"

const CALL_TYPE_COLORS = {
  internal: "#6366f1",
  external: "#0ea5e9",
  support: "#f97316",
}

function ScoreChip({ value }) {
  const color = value >= 4 ? "bg-emerald-100 text-emerald-700" : value >= 3 ? "bg-blue-100 text-blue-700" : value >= 2 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
  return <span className={cn("text-xs font-bold px-2 py-0.5 rounded", color)}>{formatScore(value)}</span>
}

const WEEK_LABELS = {
  "2026-02-02": "Feb W1",
  "2026-02-09": "Feb W2",
  "2026-02-16": "Feb W3",
  "2026-02-23": "Feb W4",
  "2026-03-02": "Mar W1",
  "2026-03-09": "Mar W2",
  "2026-03-16": "Mar W3",
  "2026-03-23": "Mar W4",
  "2026-03-30": "Apr W1",
  "2026-04-06": "Apr W2",
  "2026-04-13": "Apr W3",
  "2026-04-20": "Apr W4",
}

function weekLabel(d) {
  return WEEK_LABELS[d] || d?.slice(5) || d
}

const CALL_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
  { value: "support", label: "Support" },
]

export default function Sentiment() {
  const [selectedType, setSelectedType] = useState("all")
  const { data: timeline, isLoading: tlLoading } = useQuery({ queryKey: ["sentiment-timeline"], queryFn: api.sentimentTimeline })
  const { data: byCategory, isLoading: bcLoading } = useQuery({ queryKey: ["sentiment-by-category"], queryFn: api.sentimentByCategory })
  const { data: byTopic, isLoading: btLoading } = useQuery({ queryKey: ["sentiment-by-topic"], queryFn: api.sentimentByTopic })
  const { data: divergence, isLoading: divLoading } = useQuery({ queryKey: ["sentiment-divergence"], queryFn: api.sentimentDivergence })

  const isLoading = tlLoading || bcLoading

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-72" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )

  const weeks = (timeline?.weeks || []).map(w => ({
    ...w,
    label: weekLabel(w.weekStart),
  }))

  const categoryEntries = Object.entries(byCategory?.byCategory || {})
    .map(([cat, score]) => ({ cat: cat.charAt(0).toUpperCase() + cat.slice(1), score }))
    .sort((a, b) => b.score - a.score)

  const distributionData = byCategory?.distribution || []

  const topTopics = (byTopic?.topics || []).slice(0, 12)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sentiment Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">How sentiment shifted across 101 calls — and what it means</p>
      </div>

      {/* Timeline chart */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Sentiment Over Time</CardTitle>
              <CardDescription>Weekly average by call type · Feb – Apr 2026</CardDescription>
            </div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
            >
              {CALL_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeks} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickCount={5} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                formatter={(v) => [v?.toFixed(2), ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Line type="monotone" dataKey="avgScore" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Overall" strokeDasharray="4 2" />
              {(selectedType === "all" || selectedType === "external") && (
                <Line type="monotone" dataKey="byCallType.external" stroke={CALL_TYPE_COLORS.external} strokeWidth={selectedType === "external" ? 2.5 : 2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="External" />
              )}
              {(selectedType === "all" || selectedType === "internal") && (
                <Line type="monotone" dataKey="byCallType.internal" stroke={CALL_TYPE_COLORS.internal} strokeWidth={selectedType === "internal" ? 2.5 : 2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Internal" />
              )}
              {(selectedType === "all" || selectedType === "support") && (
                <Line type="monotone" dataKey="byCallType.support" stroke={CALL_TYPE_COLORS.support} strokeWidth={selectedType === "support" ? 2.5 : 2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Support" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sentiment by category */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment by Category</CardTitle>
            <CardDescription>Average score per call category (1–5)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {categoryEntries.map(({ cat, score }) => {
                const pct = (score / 5 * 100).toFixed(0)
                const barColor = score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-blue-500" : score >= 2 ? "bg-amber-500" : "bg-red-500"
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{cat}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                    <ScoreChip value={score} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Call count by overall sentiment label</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distributionData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, i) => {
                    const colors = {
                      "very-negative": "#ef4444",
                      "negative": "#f97316",
                      "mixed-negative": "#f59e0b",
                      "mixed-positive": "#60a5fa",
                      "positive": "#34d399",
                      "very-positive": "#10b981",
                    }
                    return <Cell key={i} fill={colors[entry.label] || "#94a3b8"} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AM Divergence */}
      {!divLoading && divergence?.divergent?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              AM Divergence Alert — Under-Reported Churn Risk
            </CardTitle>
            <CardDescription>
              These accounts show higher sentiment on external (AM) calls than on support calls — a signal that account managers may be presenting a rosier picture than reality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-2 font-medium text-muted-foreground">Account</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">AM (External)</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Support</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {divergence.divergent.map((d) => (
                    <tr key={d.account} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 font-medium">{d.account}</td>
                      <td className="py-2.5 text-right text-blue-600 font-semibold">{formatScore(d.externalAvg)}</td>
                      <td className="py-2.5 text-right text-orange-600 font-semibold">{formatScore(d.supportAvg)}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                          <ArrowUp className="h-3 w-3" />
                          +{d.divergence?.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top topics by sentiment */}
      {!btLoading && topTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Topics by Sentiment</CardTitle>
            <CardDescription>Most discussed topics ranked by average sentiment score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {topTopics.map(({ topic, avgSentiment, count }) => {
                const pct = (avgSentiment / 5 * 100).toFixed(0)
                const barColor = avgSentiment >= 4 ? "bg-emerald-500" : avgSentiment >= 3 ? "bg-blue-500" : avgSentiment >= 2 ? "bg-amber-500" : "bg-red-500"
                return (
                  <div key={topic} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground truncate w-40 flex-shrink-0">{topic}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{formatScore(avgSentiment)}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right flex-shrink-0">{count}×</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
