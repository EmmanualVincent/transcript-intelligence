import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, callTypeColor, sentimentBg, formatScore, formatDate, threadRoleLabel, momentTypeColor } from "@/lib/utils"
import { Shield, AlertTriangle, Clock, ChevronRight, Zap } from "lucide-react"

const THREAD_ROLE_COLORS = {
  war_room: "bg-red-100 text-red-700 border-red-200",
  remediation: "bg-orange-100 text-orange-700 border-orange-200",
  root_cause: "bg-amber-100 text-amber-700 border-amber-200",
  escalation: "bg-rose-100 text-rose-700 border-rose-200",
  customer_escalation: "bg-red-100 text-red-700 border-red-200",
  customer_impact: "bg-red-50 text-red-600 border-red-100",
  postmortem: "bg-violet-100 text-violet-700 border-violet-200",
  review: "bg-blue-100 text-blue-700 border-blue-200",
  reliability_sprint: "bg-teal-100 text-teal-700 border-teal-200",
  support_ticket: "bg-orange-100 text-orange-700 border-orange-200",
  customer_call: "bg-sky-100 text-sky-700 border-sky-200",
  internal: "bg-indigo-100 text-indigo-700 border-indigo-200",
}

function TimelineNode({ role }) {
  const colors = {
    war_room: "bg-red-500",
    remediation: "bg-orange-500",
    escalation: "bg-rose-500",
    customer_escalation: "bg-red-500",
    customer_impact: "bg-red-400",
    postmortem: "bg-violet-500",
    review: "bg-blue-500",
    reliability_sprint: "bg-teal-500",
    support_ticket: "bg-orange-400",
    customer_call: "bg-sky-500",
    internal: "bg-indigo-500",
    root_cause: "bg-amber-500",
  }
  return <div className={cn("h-3 w-3 rounded-full ring-2 ring-white z-10 flex-shrink-0", colors[role] || "bg-gray-400")} />
}

export default function Incidents() {
  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: api.incidents })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32" />
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
    </div>
  )

  const { thread = [], total, roleBreakdown = {}, totalChurnSignals, affectedAccounts = [] } = data || {}

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-red-600" />
            <h1 className="text-2xl font-bold tracking-tight">Detect Pipeline Incident Thread</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {total} calls in the incident narrative · {totalChurnSignals} churn signals · {affectedAccounts.length} customer accounts affected
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center flex-shrink-0">
          <p className="text-2xl font-black text-red-600">{totalChurnSignals}</p>
          <p className="text-xs text-red-700">Churn Signals</p>
        </div>
      </div>

      {/* Affected accounts */}
      {affectedAccounts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Customer Accounts Directly Impacted
          </p>
          <div className="flex gap-2 flex-wrap">
            {affectedAccounts.map(acc => (
              <Link key={acc} to={`/accounts/${encodeURIComponent(acc)}`}>
                <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer">
                  {acc}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Role breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(roleBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([role, count]) => (
          <div key={role} className={cn("px-3 py-2.5 rounded-lg border text-center", THREAD_ROLE_COLORS[role] || "bg-muted border-border")}>
            <p className="text-lg font-black">{count}</p>
            <p className="text-[10px] uppercase tracking-wide font-medium">{threadRoleLabel(role)}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Zap className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Product insight: </span>
          One infrastructure failure took down threat monitoring for 6 hours, triggered 112 support tickets, threatened 4+ major renewals, and handed SentinelShield a sales window. No prior tool surfaced this end-to-end.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border z-0" />
        <div className="space-y-6">
          {thread.map((t, i) => {
            const churnCount = (t.keyMoments || []).filter(k => k.type === "churn_signal").length
            return (
              <Link key={t.id} to={`/transcripts/${t.id}`}>
                <div className="relative flex items-start gap-4 pl-10 group">
                  <div className="absolute left-2.5 top-5">
                    <TimelineNode role={t.threadRole} />
                  </div>
                  <Card className="flex-1 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={cn("text-[10px]", THREAD_ROLE_COLORS[t.threadRole] || "bg-muted")}>{threadRoleLabel(t.threadRole)}</Badge>
                            <Badge className={cn("text-[10px]", callTypeColor(t.callType))}>{t.callType}</Badge>
                            {t.customerAccount && (
                              <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{t.customerAccount}</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{t.title}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(t.startTime)}
                            </span>
                            {churnCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                {churnCount} churn signal{churnCount > 1 ? "s" : ""}
                              </span>
                            )}
                            {t.keyMoments?.length > 0 && (
                              <div className="flex items-center gap-0.5">
                                {t.keyMoments.slice(0, 6).map((km, ki) => (
                                  <div key={ki} className={cn("h-1.5 w-1.5 rounded-full", momentTypeColor(km.type))} title={km.type} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn("text-xs font-bold px-2 py-1 rounded-lg border", sentimentBg(t.sentimentScore))}>
                            {formatScore(t.sentimentScore)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
