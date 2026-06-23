import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatDate, riskColor } from "@/lib/utils"
import { Lightbulb, AlertTriangle, Wrench, Building2, ChevronRight, Heart, ArrowUpDown } from "lucide-react"

const RISK_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 }

function getVisibleIssues(area, filter) {
  if (filter === "all") return area.issues.filter(i => i.type !== "praise")
  return area.issues.filter(i => i.type === filter)
}

const AREA_ACCENT = {
  Identity: { border: "border-l-violet-400", header: "text-violet-700", badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-400" },
  Comply:   { border: "border-l-blue-400",   header: "text-blue-700",   badge: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-400"   },
  Detect:   { border: "border-l-red-400",    header: "text-red-700",    badge: "bg-red-50 text-red-700 border-red-200",         dot: "bg-red-400"    },
  Protect:  { border: "border-l-emerald-400",header: "text-emerald-700",badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  LogVault: { border: "border-l-cyan-400",   header: "text-cyan-700",   badge: "bg-cyan-50 text-cyan-700 border-cyan-200",       dot: "bg-cyan-400"   },
  Platform: { border: "border-l-gray-400",   header: "text-gray-700",   badge: "bg-gray-50 text-gray-700 border-gray-200",       dot: "bg-gray-400"   },
}

const SIGNAL_META = {
  feature_gap:      { label: "Feature Gap",      icon: Lightbulb,    badge: "bg-violet-50 text-violet-700 border-violet-200" },
  concern:          { label: "Customer Concern",  icon: AlertTriangle, badge: "bg-amber-50 text-amber-700 border-amber-200"  },
  technical_issue:  { label: "Technical Issue",  icon: Wrench,        badge: "bg-red-50 text-red-700 border-red-200"         },
  praise:           { label: "Praise",           icon: Heart,          badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

const PRIORITY_META = {
  critical: { label: "P1", badge: "bg-red-100 text-red-700 border-red-300",          title: "Critical churn risk" },
  high:     { label: "P2", badge: "bg-orange-100 text-orange-700 border-orange-300",  title: "High churn risk"     },
  medium:   { label: "P3", badge: "bg-yellow-100 text-yellow-700 border-yellow-300",  title: "Medium churn risk"   },
  low:      { label: "P4", badge: "bg-gray-100 text-gray-500 border-gray-300",        title: "Low churn risk"      },
  praise:   { label: "P5", badge: "bg-emerald-100 text-emerald-600 border-emerald-300", title: "Praise"            },
}

const FILTER_OPTIONS = [
  { value: "all",              label: "All" },
  { value: "feature_gap",      label: "Feature Gaps" },
  { value: "concern",          label: "Concerns" },
  { value: "technical_issue",  label: "Technical Issues" },
  { value: "praise",           label: "Praise" },
]

function StatCard({ label, value, sub, color, icon: Icon }) {
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

function IssueRow({ issue }) {
  const signal = SIGNAL_META[issue.type] || SIGNAL_META.concern
  const SignalIcon = signal.icon

  return (
    <Link
      to={`/transcripts/${issue.transcriptId}`}
      className="group flex items-start gap-3 p-3.5 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-all"
    >
      <SignalIcon className={cn(
        "h-4 w-4 flex-shrink-0 mt-0.5",
        issue.type === "feature_gap" ? "text-violet-500"
          : issue.type === "concern" ? "text-amber-500"
          : issue.type === "praise" ? "text-emerald-500"
          : "text-red-500"
      )} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">{issue.text}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {(() => {
            const p = issue.type === "praise" ? PRIORITY_META.praise : PRIORITY_META[issue.riskLevel]
            return p ? (
              <Badge className={cn("text-[10px] font-bold border", p.badge)} title={p.title}>
                {p.label}
              </Badge>
            ) : null
          })()}
          <Badge className={cn("text-[10px] border", signal.badge)}>
            {signal.label}
          </Badge>
          {issue.account && (
            <Link
              to={`/accounts/${encodeURIComponent(issue.account)}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1"
            >
              <Badge className={cn("text-[10px] border", riskColor(issue.riskLevel))}>
                {issue.account}
              </Badge>
            </Link>
          )}
          {issue.date && (
            <span className="text-[10px] text-muted-foreground">{formatDate(issue.date)}</span>
          )}
          {issue.speaker && (
            <span className="text-[10px] text-muted-foreground">— {issue.speaker}</span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}

function AreaCard({ area, filter, sort }) {
  const accent = AREA_ACCENT[area.area] || AREA_ACCENT.Platform
  const visible = getVisibleIssues(area, filter)
  if (!visible.length) return null

  const isPraiseFilter = filter === "praise"
  const atRiskCount = sort === "priority"
    ? visible.filter(i => i.riskLevel === "critical" || i.riskLevel === "high").length
    : 0

  return (
    <Card className={cn("border-l-4", accent.border)} id={area.area}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className={cn("text-base", accent.header)}>{area.area}</CardTitle>
            <CardDescription className="mt-0.5">
              {visible.length} {isPraiseFilter ? "moment" : "issue"}{visible.length !== 1 ? "s" : ""}
              {filter === "all" && (
                <span className="ml-2 text-xs">
                  {area.featureGaps > 0 && <span>{area.featureGaps} gaps · </span>}
                  {area.concerns > 0 && <span>{area.concerns} concerns · </span>}
                  {area.technicalIssues > 0 && <span>{area.technicalIssues} tech issues</span>}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {atRiskCount > 0 && (
              <Badge className="text-[10px] border bg-red-50 text-red-700 border-red-200">
                {atRiskCount} at-risk
              </Badge>
            )}
            <span className={cn("text-2xl font-black", accent.header)}>{visible.length}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {visible.map((issue, i) => (
          <IssueRow key={i} issue={issue} />
        ))}
      </CardContent>
    </Card>
  )
}

export default function Features() {
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("volume")
  const { data, isLoading } = useQuery({ queryKey: ["features"], queryFn: api.features })

  if (isLoading) return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
    </div>
  )

  const {
    totalIssues = 0, totalFeatureGaps = 0, totalConcerns = 0,
    totalTechIssues = 0, totalPraise = 0, criticalRiskIssues = 0, affectedAccounts = 0,
    areas = [],
  } = data || {}

  const visibleCount = filter === "all" ? totalIssues
    : filter === "feature_gap" ? totalFeatureGaps
    : filter === "concern" ? totalConcerns
    : filter === "praise" ? totalPraise
    : totalTechIssues

  const sortedAreas = [...areas].sort((a, b) => {
    if (sort === "priority") {
      const score = area => getVisibleIssues(area, filter)
        .reduce((s, i) => s + (RISK_WEIGHT[i.riskLevel] || 0), 0)
      return score(b) - score(a)
    }
    return getVisibleIssues(b, filter).length - getVisibleIssues(a, filter).length
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Product Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalIssues} issues raised by customers in external calls — feature gaps, concerns, and technical issues across {affectedAccounts} accounts · {totalPraise} praise moments from support & external calls
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Lightbulb}      label="Feature Gaps"      value={totalFeatureGaps}    sub="Functionality customers asked for"            color="text-violet-600" />
        <StatCard icon={AlertTriangle}  label="Customer Concerns" value={totalConcerns}        sub="Pain points raised on calls"                 color="text-amber-600"  />
        <StatCard icon={Wrench}         label="Technical Issues"  value={totalTechIssues}      sub="Product problems named by customers"          color="text-red-600"    />
        <StatCard icon={Heart}          label="Praise"            value={totalPraise}          sub="From support & external calls"                color="text-emerald-600" />
        <StatCard icon={Building2}      label="Accounts Affected" value={affectedAccounts}     sub={`${criticalRiskIssues} on at-risk accounts`}  color="text-foreground" />
      </div>

      {/* Area nav */}
      <div className="flex gap-2 flex-wrap">
        {areas.map(area => {
          const accent = AREA_ACCENT[area.area] || AREA_ACCENT.Platform
          const count = filter === "all" ? (area.totalIssues - (area.praise || 0))
            : filter === "feature_gap" ? area.featureGaps
            : filter === "concern" ? area.concerns
            : filter === "praise" ? (area.praise || 0)
            : area.technicalIssues
          if (!count) return null
          return (
            <a
              key={area.area}
              href={`#${area.area}`}
              className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80", accent.badge)}
            >
              <span className={cn("h-2 w-2 rounded-full flex-shrink-0", accent.dot)} />
              {area.area}
              <span className="font-bold">{count}</span>
            </a>
          )
        })}
      </div>

      {/* Filter tabs + Sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5 p-1 bg-muted rounded-xl w-fit">
          {FILTER_OPTIONS.map(opt => {
            const count = opt.value === "all" ? totalIssues
              : opt.value === "feature_gap" ? totalFeatureGaps
              : opt.value === "concern" ? totalConcerns
              : opt.value === "praise" ? totalPraise
              : totalTechIssues
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                  filter === opt.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
                <span className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                  filter === opt.value ? "bg-primary/10 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Sort:</span>
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            {[{ value: "volume", label: "Volume" }, { value: "priority", label: "Priority" }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  sort === opt.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Area cards */}
      <div className="space-y-4">
        {sortedAreas.map(area => (
          <AreaCard key={area.area} area={area} filter={filter} sort={sort} />
        ))}
      </div>

      {visibleCount === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No {filter === "all" ? "issues" : filter === "praise" ? "praise moments" : SIGNAL_META[filter]?.label.toLowerCase() + "s"} found.
        </div>
      )}
    </div>
  )
}
