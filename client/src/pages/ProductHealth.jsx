import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatScore, formatDate, riskColor } from "@/lib/utils"
import {
  AlertTriangle, Zap, Star, RefreshCw,
  ArrowUpRight, ChevronRight, Users, BarChart2,
} from "lucide-react"

const PRODUCT_STYLE = {
  Comply:   { bg: "bg-blue-50 dark:bg-blue-950/40",    border: "border-blue-200 dark:border-blue-800/60",   accent: "bg-blue-600",    text: "text-blue-700 dark:text-blue-400",   muted: "text-blue-500 dark:text-blue-400",   ring: "ring-blue-200 dark:ring-blue-800"   },
  Identity: { bg: "bg-violet-50 dark:bg-violet-950/40",  border: "border-violet-200 dark:border-violet-800/60", accent: "bg-violet-600",  text: "text-violet-700 dark:text-violet-400", muted: "text-violet-500 dark:text-violet-400", ring: "ring-violet-200 dark:ring-violet-800" },
  Detect:   { bg: "bg-red-50 dark:bg-red-950/40",     border: "border-red-200 dark:border-red-800/60",    accent: "bg-red-600",     text: "text-red-700 dark:text-red-400",    muted: "text-red-500 dark:text-red-400",    ring: "ring-red-200 dark:ring-red-800"    },
  Protect:  { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800/60", accent: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-400", muted: "text-emerald-500 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
  LogVault: { bg: "bg-cyan-50 dark:bg-cyan-950/40",    border: "border-cyan-200 dark:border-cyan-800/60",   accent: "bg-cyan-600",    text: "text-cyan-700 dark:text-cyan-400",   muted: "text-cyan-500 dark:text-cyan-400",   ring: "ring-cyan-200 dark:ring-cyan-800"   },
  Platform: { bg: "bg-gray-50 dark:bg-gray-900/40",    border: "border-gray-200 dark:border-gray-700/60",   accent: "bg-gray-600",    text: "text-gray-700 dark:text-gray-400",   muted: "text-gray-500 dark:text-gray-400",   ring: "ring-gray-200 dark:ring-gray-700"   },
}

const TAG_META = {
  retention_driver:  { label: "Retention Driver",   icon: RefreshCw,     color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60" },
  upsell_opportunity:{ label: "Upsell Opportunity", icon: ArrowUpRight,   color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60"                  },
  high_satisfaction: { label: "High Satisfaction",  icon: Star,           color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"             },
  active_adoption:   { label: "Active Adoption",    icon: Zap,            color: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60"        },
  at_risk:           { label: "At Risk",            icon: AlertTriangle,  color: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60"                         },
}

const ISSUE_STYLE = {
  churn_signal: { dot: "bg-red-500",    label: "Churn Signal"   },
  feature_gap:  { dot: "bg-violet-500", label: "Feature Gap"    },
  concern:      { dot: "bg-amber-500",  label: "Concern"        },
}

function HealthBar({ score }) {
  const color = score >= 70 ? "bg-emerald-500"
    : score >= 50 ? "bg-blue-500"
    : score >= 30 ? "bg-amber-500"
    : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Health score</span>
        <span className={cn("text-sm font-bold",
          score >= 70 ? "text-emerald-600" : score >= 50 ? "text-blue-600" : score >= 30 ? "text-amber-600" : "text-red-600"
        )}>{score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function StatPill({ label, value, positive }) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-black leading-none", positive === true ? "text-emerald-600" : positive === false ? "text-red-600" : "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function QuoteCard({ quote }) {
  return (
    <Link
      to={`/transcripts/${quote.transcriptId}`}
      className="group block p-3 rounded-lg bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <p className="text-xs text-foreground leading-relaxed line-clamp-3 italic">
        "{quote.text}"
      </p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {quote.account && (
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", riskColor(quote.riskLevel))}>
            {quote.account}
          </span>
        )}
        {quote.date && <span className="text-[10px] text-muted-foreground">{formatDate(quote.date)}</span>}
        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
      </div>
    </Link>
  )
}

function IssueRow({ issue }) {
  const meta = ISSUE_STYLE[issue.type] || { dot: "bg-gray-400", label: issue.type }
  return (
    <Link
      to={`/transcripts/${issue.transcriptId}`}
      className="group flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all"
    >
      <div className={cn("h-2 w-2 rounded-full flex-shrink-0 mt-1.5", meta.dot)} />
      <p className="text-xs text-foreground leading-relaxed flex-1 line-clamp-2">{issue.text}</p>
      <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}

function UpsellRow({ upsell }) {
  return (
    <Link
      to={`/transcripts/${upsell.transcriptId}`}
      className="group flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all"
    >
      <ArrowUpRight className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-foreground leading-relaxed flex-1 line-clamp-2">{upsell.text}</p>
      <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}

function ProductCard({ product, expanded, onToggle }) {
  const style = PRODUCT_STYLE[product.name] || PRODUCT_STYLE.Platform
  const hasPositives = product.topQuotes.length > 0
  const hasIssues = product.topIssues.length > 0
  const hasUpsells = product.upsellMoments.length > 0

  return (
    <Card className={cn("overflow-hidden border", style.border)}>
      {/* Top accent strip */}
      <div className={cn("h-1 w-full", style.accent)} />

      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0", style.accent)}>
            {product.name.slice(0, 2)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground">{product.name}</h3>
              {product.tags.map(tag => {
                const meta = TAG_META[tag]
                if (!meta) return null
                const Icon = meta.icon
                return (
                  <span key={tag} className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", meta.color)}>
                    <Icon className="h-2.5 w-2.5" />
                    {meta.label}
                  </span>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {product.callCount} customer call{product.callCount !== 1 ? "s" : ""} · {product.accountCount} account{product.accountCount !== 1 ? "s" : ""}
              {product.renewalCalls > 0 && ` · ${product.renewalCalls} renewals`}
              {product.onboardingCalls > 0 && ` · ${product.onboardingCalls} onboardings`}
            </p>
          </div>

          <div className="flex-shrink-0 text-right">
            <p className={cn("text-3xl font-black leading-none",
              product.avgSentiment >= 4 ? "text-emerald-600"
              : product.avgSentiment >= 3 ? "text-blue-600"
              : product.avgSentiment >= 2 ? "text-amber-600"
              : "text-red-600"
            )}>
              {formatScore(product.avgSentiment)}
            </p>
            <p className="text-[10px] text-muted-foreground">avg sentiment</p>
          </div>
        </div>

        {/* Health bar */}
        <div className="mt-4">
          <HealthBar score={product.healthScore} style={style} />
        </div>

        {/* Signal pills */}
        <div className={cn("mt-4 grid grid-cols-4 gap-2 p-3 rounded-xl border", style.bg, style.border)}>
          <StatPill label="Praise" value={product.praiseCount} positive={product.praiseCount > 0 ? true : null} />
          <StatPill label="Churn signals" value={product.churnSignalCount} positive={product.churnSignalCount > 0 ? false : null} />
          <StatPill label="Feature gaps" value={product.featureGapCount} positive={null} />
          <StatPill label="Upsells" value={product.upsellCount} positive={product.upsellCount > 0 ? true : null} />
        </div>

        {/* Top quote — always visible */}
        {hasPositives && (
          <div className="mt-4">
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-2", style.muted)}>
              Customer Voice
            </p>
            <QuoteCard quote={product.topQuotes[0]} style={style} />
          </div>
        )}

        {/* Toggle for more detail */}
        <button
          onClick={onToggle}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {expanded ? "Show less" : "Show full breakdown"}
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 space-y-4 pt-4 border-t border-border">

            {/* All quotes */}
            {product.topQuotes.length > 1 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">More praise</p>
                <div className="space-y-2">
                  {product.topQuotes.slice(1).map((q, i) => <QuoteCard key={i} quote={q} style={style} />)}
                </div>
              </div>
            )}

            {/* Upsell moments */}
            {hasUpsells && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Upsell / Expansion signals</p>
                <div className={cn("rounded-xl border p-2 space-y-0.5", style.bg, style.border)}>
                  {product.upsellMoments.map((u, i) => <UpsellRow key={i} upsell={u} />)}
                </div>
              </div>
            )}

            {/* Top issues */}
            {hasIssues && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Top issues to address</p>
                <div className="rounded-xl border bg-muted/30 p-2 space-y-0.5">
                  {product.topIssues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProductHealth() {
  const [expanded, setExpanded] = useState(null)
  const [sort, setSort] = useState("health") // "health" | "sentiment" | "calls"
  const { data, isLoading } = useQuery({ queryKey: ["product-health"], queryFn: api.productHealth })

  if (isLoading) return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72" />)}
      </div>
    </div>
  )

  const { products = [] } = data || {}

  const sorted = [...products].sort((a, b) =>
    sort === "health" ? b.healthScore - a.healthScore
    : sort === "sentiment" ? (b.avgSentiment ?? 0) - (a.avgSentiment ?? 0)
    : b.callCount - a.callCount
  )

  const avgHealth = products.length
    ? Math.round(products.reduce((s, p) => s + p.healthScore, 0) / products.length)
    : 0
  const atRiskProducts = products.filter(p => p.tags.includes("at_risk"))
  const upsellProducts = products.filter(p => p.tags.includes("upsell_opportunity"))

  const SORT_OPTIONS = [
    { value: "health",    label: "Health Score" },
    { value: "sentiment", label: "Sentiment"    },
    { value: "calls",     label: "Call Volume"  },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Product Health</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Adoption, satisfaction, and retention signals per product — from {products.reduce((s, p) => s + p.callCount, 0)} external customer calls
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Portfolio Health</p>
                <p className={cn("text-3xl font-bold mt-1 tracking-tight",
                  avgHealth >= 70 ? "text-emerald-600" : avgHealth >= 50 ? "text-blue-600" : avgHealth >= 30 ? "text-amber-600" : "text-red-600"
                )}>{avgHealth}/100</p>
              </div>
              <div className="p-2 rounded-lg bg-muted"><BarChart2 className="h-5 w-5 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Products Tracked</p>
                <p className="text-3xl font-bold mt-1 tracking-tight">{products.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{products.reduce((s,p)=>s+p.accountCount,0)} unique accounts</p>
              </div>
              <div className="p-2 rounded-lg bg-muted"><Users className="h-5 w-5 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upsell Opportunities</p>
                <p className="text-3xl font-bold mt-1 tracking-tight text-blue-600">{upsellProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{upsellProducts.map(p=>p.name).join(", ") || "—"}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-blue-600"><ArrowUpRight className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">At Risk</p>
                <p className="text-3xl font-bold mt-1 tracking-tight text-red-600">{atRiskProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{atRiskProducts.map(p=>p.name).join(", ") || "All healthy"}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-red-600"><AlertTriangle className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium">Sort by</span>
        <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                sort === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map(product => (
          <ProductCard
            key={product.name}
            product={product}
            expanded={expanded === product.name}
            onToggle={() => setExpanded(expanded === product.name ? null : product.name)}
          />
        ))}
      </div>
    </div>
  )
}
