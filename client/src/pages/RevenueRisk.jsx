import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, riskColor, formatDate, formatScore, sentimentBg } from "@/lib/utils"
import { DollarSign, AlertCircle, Clock, Eye, RefreshCw, TrendingDown, Swords, ChevronRight } from "lucide-react"

const TIER_CONFIG = {
  act_now: {
    label: "Act Now",
    description: "Renewal + active competitor evaluation + churn signals. Every day without contact increases loss probability.",
    headerClass: "bg-red-50 border-red-200",
    titleClass: "text-red-800",
    descClass: "text-red-700",
    badgeClass: "bg-red-600 text-white",
    icon: AlertCircle,
    iconClass: "text-red-600",
    cardBorder: "border-red-200 hover:border-red-400",
    accentBar: "bg-red-500",
  },
  act_soon: {
    label: "Act Soon",
    description: "Two of three risk factors present. No immediate renewal deadline but churn signals are escalating.",
    headerClass: "bg-orange-50 border-orange-200",
    titleClass: "text-orange-800",
    descClass: "text-orange-700",
    badgeClass: "bg-orange-500 text-white",
    icon: Clock,
    iconClass: "text-orange-500",
    cardBorder: "border-orange-200 hover:border-orange-400",
    accentBar: "bg-orange-500",
  },
  watch: {
    label: "Watch Closely",
    description: "Elevated risk score with strong signals but no renewal deadline yet. Set a follow-up cadence.",
    headerClass: "bg-amber-50 border-amber-200",
    titleClass: "text-amber-800",
    descClass: "text-amber-700",
    badgeClass: "bg-amber-500 text-white",
    icon: Eye,
    iconClass: "text-amber-500",
    cardBorder: "border-amber-200 hover:border-amber-400",
    accentBar: "bg-amber-500",
  },
}

function SignalPill({ icon: Icon, label, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", className)}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

function AccountCard({ account, tier }) {
  const cfg = TIER_CONFIG[tier]
  const topSignal = account.churnSignals?.[0]

  return (
    <Link
      to={`/accounts/${encodeURIComponent(account.name)}`}
      className={cn(
        "group block rounded-xl border-2 bg-white transition-all hover:shadow-md overflow-hidden",
        cfg.cardBorder
      )}
    >
      <div className={cn("h-1 w-full", cfg.accentBar)} />
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
              {account.name}
            </p>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 inline-block capitalize", riskColor(account.riskLevel))}>
              {account.riskLevel} risk · {account.riskScore}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Signal pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {account.hasUpcomingRenewal && (
            <SignalPill icon={RefreshCw} label="Renewal pending" className="bg-blue-50 text-blue-700 border-blue-200" />
          )}
          {account.churnSignalCount > 0 && (
            <SignalPill icon={TrendingDown} label={`${account.churnSignalCount} churn signal${account.churnSignalCount !== 1 ? 's' : ''}`} className="bg-red-50 text-red-700 border-red-200" />
          )}
          {account.competitors?.map(c => (
            <SignalPill key={c} icon={Swords} label={c} className="bg-rose-50 text-rose-700 border-rose-200" />
          ))}
        </div>

        {/* Top churn signal quote */}
        {topSignal && (
          <div className="bg-muted/60 rounded-lg p-2.5 mb-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
              "{topSignal.text}"
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {topSignal.date && (
                <span className="text-[10px] text-muted-foreground">{formatDate(topSignal.date)}</span>
              )}
              {topSignal.sentimentScore != null && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", sentimentBg(topSignal.sentimentScore))}>
                  {formatScore(topSignal.sentimentScore)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{account.transcriptCount} call{account.transcriptCount !== 1 ? 's' : ''} on record</span>
          {account.lastCallDate && <span>Last: {formatDate(account.lastCallDate)}</span>}
          {account.avgSentimentScore != null && (
            <span className={cn("font-bold px-1.5 py-0.5 rounded", sentimentBg(account.avgSentimentScore))}>
              avg {formatScore(account.avgSentimentScore)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function TierSection({ tier, accounts }) {
  if (!accounts?.length) return null
  const cfg = TIER_CONFIG[tier]
  const Icon = cfg.icon

  return (
    <div className="space-y-3">
      <div className={cn("rounded-xl border p-4 flex items-start gap-3", cfg.headerClass)}>
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", cfg.iconClass)} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className={cn("font-bold text-base", cfg.titleClass)}>{cfg.label}</h2>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", cfg.badgeClass)}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className={cn("text-sm mt-0.5", cfg.descClass)}>{cfg.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {accounts.map(acc => (
          <AccountCard key={acc.name} account={acc} tier={tier} />
        ))}
      </div>
    </div>
  )
}

export default function RevenueRisk() {
  const { data, isLoading } = useQuery({ queryKey: ["revenue-risk"], queryFn: api.revenueRisk })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
    </div>
  )

  const accounts = data?.accounts || []
  const actNow  = accounts.filter(a => a.tier === 'act_now')
  const actSoon = accounts.filter(a => a.tier === 'act_soon')
  const watch   = accounts.filter(a => a.tier === 'watch')
  const { tierCounts } = data || {}

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue at Risk</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Accounts where renewal, churn signals, and competitor evaluations converge — prioritized for immediate CSM intervention
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-2xl font-black text-red-700">{tierCounts?.act_now || 0}</p>
                <p className="text-xs font-semibold text-red-700">Act Now</p>
                <p className="text-[10px] text-red-600">All 3 risk signals present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-black text-orange-600">{tierCounts?.act_soon || 0}</p>
                <p className="text-xs font-semibold text-orange-700">Act Soon</p>
                <p className="text-[10px] text-orange-600">2 of 3 risk signals present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-2xl font-black text-foreground">{data?.total || 0}</p>
                <p className="text-xs font-semibold text-foreground">Total at Risk</p>
                <p className="text-[10px] text-muted-foreground">across all call data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier sections */}
      <TierSection tier="act_now"  accounts={actNow} />
      <TierSection tier="act_soon" accounts={actSoon} />
      <TierSection tier="watch"    accounts={watch} />
    </div>
  )
}
