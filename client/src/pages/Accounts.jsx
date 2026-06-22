import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select } from "@/components/ui/select"
import { cn, riskColor, riskBarColor, formatScore, formatDate, sentimentColor } from "@/lib/utils"
import { AlertTriangle, TrendingDown, Shield, ChevronRight, ArrowUpDown } from "lucide-react"

const RISK_LEVELS = ["", "critical", "high", "medium", "low"]
const SORT_OPTIONS = [
  { value: "riskScore", label: "Risk Score" },
  { value: "sentiment", label: "Sentiment" },
  { value: "lastCall", label: "Last Call" },
  { value: "name", label: "Name" },
]

function RiskBadge({ level }) {
  const icons = { critical: AlertTriangle, high: TrendingDown, medium: Shield, low: Shield }
  const Icon = icons[level] || Shield
  return (
    <Badge className={cn("gap-1 text-xs", riskColor(level))}>
      <Icon className="h-3 w-3" />
      {level}
    </Badge>
  )
}

export default function Accounts() {
  const [riskLevel, setRiskLevel] = useState("")
  const [sort, setSort] = useState("riskScore")

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", riskLevel, sort],
    queryFn: () => api.accounts({ riskLevel: riskLevel || undefined, sort }),
  })

  const accounts = data?.accounts || []
  const criticalCount = accounts.filter(a => a.riskLevel === "critical").length
  const highCount = accounts.filter(a => a.riskLevel === "high").length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Health</h1>
        <p className="text-muted-foreground text-sm mt-1">Risk-scored accounts ranked by churn signals, sentiment, and competitive exposure</p>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Critical", count: data?.accounts?.filter(a => a.riskLevel === "critical").length || 0, color: "bg-red-100 text-red-700 border-red-200" },
          { label: "High Risk", count: data?.accounts?.filter(a => a.riskLevel === "high").length || 0, color: "bg-orange-100 text-orange-700 border-orange-200" },
          { label: "Medium", count: data?.accounts?.filter(a => a.riskLevel === "medium").length || 0, color: "bg-amber-100 text-amber-700 border-amber-200" },
          { label: "Low", count: data?.accounts?.filter(a => a.riskLevel === "low").length || 0, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
        ].map(({ label, count, color }) => (
          <button
            key={label}
            onClick={() => setRiskLevel(riskLevel === label.toLowerCase().split(" ")[0] ? "" : label.toLowerCase().split(" ")[0])}
            className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:shadow-sm", color)}
          >
            {count} {label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className="w-36">
              {RISK_LEVELS.map(v => (
                <option key={v} value={v}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : "All Risks"}</option>
              ))}
            </Select>
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sort} onChange={e => setSort(e.target.value)} className="w-40">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            {data && (
              <span className="text-sm text-muted-foreground">{data.total} accounts</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="col-span-3">Account</div>
                <div className="col-span-2">Risk Score</div>
                <div className="col-span-1 text-center">Churn</div>
                <div className="col-span-1 text-center">Sentiment</div>
                <div className="col-span-2">Competitors</div>
                <div className="col-span-2">Last Call</div>
                <div className="col-span-1"></div>
              </div>
              {accounts.map((account) => (
                <Link
                  key={account.name}
                  to={`/accounts/${encodeURIComponent(account.name)}`}
                  className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-muted/50 transition-colors items-center group"
                >
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {account.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{account.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RiskBadge level={account.riskLevel} />
                        {account.hasUpcomingRenewal && (
                          <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Renewal</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", riskBarColor(account.riskLevel))}
                          style={{ width: `${account.riskScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 flex-shrink-0">{account.riskScore}</span>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    {account.churnSignalCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {account.churnSignalCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={cn("text-sm font-semibold", sentimentColor(account.avgSentimentScore))}>
                      {formatScore(account.avgSentimentScore)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex gap-1 flex-wrap">
                      {(account.competitors || []).map(c => (
                        <Badge key={c} className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">{c}</Badge>
                      ))}
                      {(!account.competitors?.length) && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {formatDate(account.lastCallDate)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
