import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatScore, riskColor } from "@/lib/utils"
import {
  AlertTriangle, TrendingDown, Users, Zap, MessageSquare,
  ArrowRight, Shield, Target, Lightbulb
} from "lucide-react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from "recharts"

const CALL_TYPE_COLORS = {
  internal: "#6366f1",
  external: "#0ea5e9",
  support: "#f97316",
}

const CATEGORY_COLORS = [
  "#ef4444", "#3b82f6", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899", "#14b8a6", "#6b7280"
]

function StatCard({ icon: Icon, label, value, sub, color = "text-foreground", className }) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
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

function SentimentBar({ label, value, max = 5 }) {
  const pct = ((value / max) * 100).toFixed(0)
  const bg = value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-blue-500" : value >= 2 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-sm font-semibold w-8 text-right", value >= 4 ? "text-emerald-600" : value >= 3 ? "text-blue-600" : value >= 2 ? "text-amber-600" : "text-red-600")}>
        {formatScore(value)}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: api.overview })

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  )

  const { callTypeBreakdown, categoryBreakdown, avgSentimentByCallType } = data

  const callTypePie = Object.entries(callTypeBreakdown || {}).map(([name, value]) => ({
    name, value, color: CALL_TYPE_COLORS[name]
  }))

  const categoryEntries = Object.entries(categoryBreakdown || {}).sort((a, b) => b[1] - a[1])
  const categoryBar = categoryEntries.map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: value,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Intelligence Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data.dateRange?.start} – {data.dateRange?.end} · {data.totalTranscripts} calls analyzed
          </p>
        </div>
        <Link
          to="/incidents"
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Shield className="h-4 w-4" />
          View Incident Thread
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Alert banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Critical: Detect Pipeline Outage Impact Detected</p>
          <p className="text-sm text-red-700 mt-0.5">
            {data.totalChurnSignals} churn signals across {data.totalTranscripts} calls · {data.criticalAccounts} enterprise accounts at critical risk · Competitors evaluating opportunities
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Calls" value={data.totalTranscripts} sub={`${data.dateRange?.start} – ${data.dateRange?.end}`} />
        <StatCard icon={AlertTriangle} label="Churn Signals" value={data.totalChurnSignals} sub="Across all transcripts" color="text-red-600" />
        <StatCard icon={Users} label="Critical Accounts" value={data.criticalAccounts} sub={`${data.highRiskAccounts} more at high risk`} color="text-orange-600" />
        <StatCard icon={Target} label="Competitors Flagged" value={data.competitorsDetected?.length || 0} sub={data.competitorsDetected?.join(", ")} color="text-violet-600" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Call type distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Call Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={callTypePie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {callTypePie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name.charAt(0).toUpperCase() + name.slice(1)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-shrink-0">
                {callTypePie.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs text-muted-foreground capitalize">{name}</span>
                    <span className="text-xs font-bold ml-auto pl-2">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment by call type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Avg Sentiment by Call Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <SentimentBar label="External" value={avgSentimentByCallType?.external} />
            <SentimentBar label="Internal" value={avgSentimentByCallType?.internal} />
            <SentimentBar label="Support" value={avgSentimentByCallType?.support} />
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="font-semibold">AM Divergence Alert:</span> Account managers report higher sentiment than support — potential churn under-reporting.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature gaps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Signal Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "Churn Signals", value: data.totalChurnSignals, color: "bg-red-500", icon: TrendingDown },
              { label: "Feature Gaps", value: data.totalFeatureGaps, color: "bg-violet-500", icon: Lightbulb },
              { label: "Positive Signals", value: data.totalPraise || 0, color: "bg-emerald-500", icon: Zap },
              { label: "Total Accounts", value: data.totalAccounts || 0, color: "bg-blue-500", icon: Users },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className="text-sm font-bold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown + At-risk accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Calls by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryBar} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryBar.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">At-Risk Accounts</CardTitle>
            <Link to="/accounts" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.topAtRiskAccounts || []).map((account) => (
              <Link
                key={account.name}
                to={`/accounts/${encodeURIComponent(account.name)}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {account.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {account.churnSignalCount} churn signals · {account.competitors?.join(", ") || "no competitors"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", account.riskLevel === "critical" ? "bg-red-500" : account.riskLevel === "high" ? "bg-orange-500" : "bg-amber-500")}
                      style={{ width: `${account.riskScore}%` }}
                    />
                  </div>
                  <Badge className={cn("text-xs", riskColor(account.riskLevel))}>
                    {account.riskLevel}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
