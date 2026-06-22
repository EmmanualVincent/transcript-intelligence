import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatScore, sentimentBg, callTypeColor, formatDate } from "@/lib/utils"
import { Swords, ArrowRight, ChevronRight, TrendingDown } from "lucide-react"

const COMPETITOR_COLORS = {
  SentinelShield: "from-red-500 to-rose-600",
  CyberNova: "from-blue-500 to-indigo-600",
  VaultGuard: "from-violet-500 to-purple-600",
  Wiz: "from-emerald-500 to-teal-600",
  CrowdStrike: "from-orange-500 to-amber-600",
  Splunk: "from-cyan-500 to-sky-600",
}

function CompetitorCard({ competitor, isSelected, onClick }) {
  const gradient = COMPETITOR_COLORS[competitor.name] || "from-gray-500 to-gray-600"
  const threatLevel = competitor.mentionCount >= 8 ? "Critical Threat" : competitor.mentionCount >= 4 ? "Active Threat" : "Monitored"
  const threatColor = competitor.mentionCount >= 8 ? "bg-red-100 text-red-700 border-red-200" : competitor.mentionCount >= 4 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-blue-100 text-blue-700 border-blue-200"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md",
        isSelected ? "border-primary shadow-md" : "border-border hover:border-primary/40"
      )}
    >
      <div className={cn("h-1.5 bg-gradient-to-r", gradient)} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-foreground">{competitor.name}</p>
            <Badge className={cn("text-[10px] mt-1", threatColor)}>{threatLevel}</Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-foreground">{competitor.mentionCount}</p>
            <p className="text-[10px] text-muted-foreground">mentions</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {Object.entries(competitor.callTypes || {}).map(([type, count]) => (
            <div key={type} className="bg-muted rounded-lg p-1.5">
              <p className="text-xs font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{type}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {(competitor.affectedAccounts || []).slice(0, 2).map(acc => (
              <span key={acc} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{acc}</span>
            ))}
            {(competitor.affectedAccounts?.length || 0) > 2 && (
              <span className="text-[10px] text-muted-foreground">+{competitor.affectedAccounts.length - 2} more</span>
            )}
          </div>
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded", sentimentBg(competitor.avgSentimentAtMention))}>
            {formatScore(competitor.avgSentimentAtMention)} avg
          </span>
        </div>
      </div>
    </button>
  )
}

function ContextCard({ ctx }) {
  return (
    <Link to={`/transcripts/${ctx.transcriptId}`} className="block p-4 rounded-xl border hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <div className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
          ctx.sentimentScore < 2.5 ? "bg-red-500" : ctx.sentimentScore < 3.5 ? "bg-amber-500" : "bg-emerald-500"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {ctx.account && (
              <Badge className="text-[10px] bg-muted text-muted-foreground">{ctx.account}</Badge>
            )}
            <Badge className={cn("text-[10px]", callTypeColor(ctx.callType))}>{ctx.callType}</Badge>
            {ctx.date && <span className="text-[10px] text-muted-foreground">{formatDate(ctx.date)}</span>}
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto", sentimentBg(ctx.sentimentScore))}>
              {formatScore(ctx.sentimentScore)}
            </span>
          </div>
          <p className="text-xs font-medium text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">{ctx.transcriptTitle}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ctx.momentText}</p>
        </div>
      </div>
    </Link>
  )
}

export default function Competitive() {
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ["competitive"], queryFn: api.competitive })
  const { data: detail } = useQuery({
    queryKey: ["competitor", selected],
    queryFn: () => api.competitor(selected),
    enabled: !!selected,
  })

  const competitors = data?.competitors || []

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitive Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">Competitor mentions across all 101 calls — when, where, and by whom</p>
      </div>

      {/* Insight */}
      {competitors.length > 0 && (() => {
        const top = [...competitors].sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0))[0]
        const totalMentions = competitors.reduce((s, c) => s + (c.mentionCount || 0), 0)
        return (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
            <Swords className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">
                {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} mentioned across {totalMentions} instance{totalMentions !== 1 ? 's' : ''}
              </p>
              {top && (
                <p className="text-sm text-rose-700 mt-0.5">
                  {top.name} is the most frequently mentioned with {top.mentionCount} mention{top.mentionCount !== 1 ? 's' : ''}.
                  Click any card below to explore the accounts and calls where they appear.
                </p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Competitor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitors.map(comp => (
          <CompetitorCard
            key={comp.name}
            competitor={comp}
            isSelected={selected === comp.name}
            onClick={() => setSelected(selected === comp.name ? null : comp.name)}
          />
        ))}
      </div>

      {/* Detail view */}
      {selected && detail && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{detail.name} — Mention Contexts</CardTitle>
                <CardDescription>
                  {detail.mentionCount} mentions across {detail.affectedAccounts?.length || 0} accounts · Avg sentiment: {formatScore(detail.avgSentimentAtMention)} (calls are more negative when this competitor appears)
                </CardDescription>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-sm px-3 py-1 rounded-lg hover:bg-muted transition-colors">
                Close
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {(detail.contexts || []).map((ctx, i) => (
                <ContextCard key={i} ctx={ctx} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affected accounts summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Accounts Evaluating Competitors</CardTitle>
          <CardDescription>Accounts that mentioned competitors in their calls — high priority for retention outreach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...new Set(competitors.flatMap(c => c.affectedAccounts || []))].map(account => {
              const mentionedBy = competitors.filter(c => (c.affectedAccounts || []).includes(account)).map(c => c.name)
              return (
                <Link
                  key={account}
                  to={`/accounts/${encodeURIComponent(account)}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/50 transition-all group"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">{account?.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{account}</p>
                    <div className="flex gap-1 mt-0.5">
                      {mentionedBy.map(c => (
                        <Badge key={c} className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
