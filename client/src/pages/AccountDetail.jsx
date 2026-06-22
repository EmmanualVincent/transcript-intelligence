import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, riskColor, riskBarColor, sentimentBg, formatScore, formatDate, categoryColor, callTypeColor, momentTypeBadge, momentTypeColor } from "@/lib/utils"
import { ArrowLeft, AlertTriangle, TrendingDown, Clock, Users, ChevronRight } from "lucide-react"

function ScoreBreakdownBar({ parts, total }) {
  return (
    <div className="space-y-2">
      {parts.map(({ label, points }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-52 flex-shrink-0">{label}</span>
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn("h-full rounded-full", points < 0 ? "bg-emerald-500" : "bg-red-500")}
              style={{ width: `${Math.abs(points) / total * 100}%` }}
            />
          </div>
          <span className={cn("text-xs font-bold w-8 text-right flex-shrink-0", points < 0 ? "text-emerald-600" : "text-red-600")}>
            {points > 0 ? "+" : ""}{points}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AccountDetail() {
  const { name } = useParams()
  const { data: account, isLoading, error } = useQuery({
    queryKey: ["account", name],
    queryFn: () => api.account(decodeURIComponent(name)),
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
    </div>
  )
  if (error || !account) return <div className="p-6 text-red-600">Account not found.</div>

  const totalScore = (account.scoreBreakdown || []).reduce((s, p) => s + Math.abs(p.points), 0) || 100

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <Link to="/accounts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Accounts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-2xl font-bold text-foreground">
            {account.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={cn("text-xs", riskColor(account.riskLevel))}>
                {account.riskLevel} risk
              </Badge>
              {account.hasUpcomingRenewal && (
                <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">Upcoming Renewal</Badge>
              )}
              <span className="text-xs text-muted-foreground">{account.transcriptCount} calls</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Risk Score</p>
          <p className="text-4xl font-black tracking-tight text-red-600">{account.riskScore}</p>
          <p className="text-xs text-muted-foreground">out of 100</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Sentiment", value: formatScore(account.avgSentimentScore), sub: "across all calls", color: account.avgSentimentScore < 3 ? "text-red-600" : "text-emerald-600" },
          { label: "Churn Signals", value: account.churnSignalCount, sub: "high-risk moments", color: "text-red-600" },
          { label: "Competitor Mentions", value: account.competitorMentions || 0, sub: (account.competitors || []).join(", ") || "—", color: "text-rose-600" },
          { label: "Feature Gaps", value: account.featureGapCount, sub: "unmet needs identified", color: "text-violet-600" },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className={cn("text-3xl font-black mt-1 tracking-tight", color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Score Breakdown</CardTitle>
            <CardDescription>How the score was calculated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total risk</span>
                <span className="text-sm font-bold">{account.riskScore}/100</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", riskBarColor(account.riskLevel))}
                  style={{ width: `${account.riskScore}%` }}
                />
              </div>
            </div>
            <ScoreBreakdownBar parts={account.scoreBreakdown || []} total={totalScore} />
          </CardContent>
        </Card>

        {/* Top concerns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Concerns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(account.topConcerns || []).map((concern, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                <p className="text-xs text-foreground capitalize">{concern}</p>
              </div>
            ))}
            {account.competitors?.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Competitors Being Evaluated</p>
                {account.competitors.map(c => (
                  <Link key={c} to={`/competitive`} className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors mb-1.5">
                    <span className="text-xs font-semibold text-rose-700">{c}</span>
                    <ChevronRight className="h-3 w-3 text-rose-500" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Call Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {(account.transcripts || []).map(t => (
              <Link key={t.id} to={`/transcripts/${t.id}`} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted transition-colors group">
                <div className={cn("h-2 w-2 rounded-full flex-shrink-0",
                  t.sentimentScore < 2.5 ? "bg-red-500" : t.sentimentScore < 3.5 ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(t.startTime)}</p>
                </div>
                <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", sentimentBg(t.sentimentScore))}>
                  {formatScore(t.sentimentScore)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* All Key Moments */}
      {account.allKeyMoments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Key Moments Across All Calls ({account.allKeyMoments.length})</CardTitle>
            <CardDescription>Every flagged moment from this account's transcripts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {account.allKeyMoments
                .sort((a, b) => {
                  const order = ["churn_signal", "feature_gap", "concern", "technical_issue", "positive_pivot", "praise"]
                  return order.indexOf(a.type) - order.indexOf(b.type)
                })
                .map((km, i) => (
                  <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg")}>
                    <div className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0", momentTypeColor(km.type))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <Badge className={cn("text-[10px]", momentTypeBadge(km.type))}>{km.type?.replace("_", " ")}</Badge>
                        {km.speaker && <span className="text-[10px] text-muted-foreground">{km.speaker}</span>}
                        <Link to={`/transcripts/${km.transcriptId}`} className="text-[10px] text-primary hover:underline ml-auto">
                          {km.transcriptTitle?.slice(0, 40)}…
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{km.text}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
