import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, riskColor, callTypeColor, formatDate } from "@/lib/utils"
import { ClipboardList, AlertTriangle, User, Building2, ChevronRight, ChevronDown } from "lucide-react"

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3, null: 4 }

function StatCard({ label, value, sub, accent }) {
  return (
    <Card className={cn("border", accent)}>
      <CardContent className="pt-5 pb-4">
        <p className="text-2xl font-black text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function RiskDot({ level }) {
  const colors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  }
  return <span className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", colors[level] || "bg-gray-300")} />
}

function ActionItem({ item }) {
  return (
    <Link
      to={`/transcripts/${item.transcriptId}`}
      className="group flex items-start gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/40 transition-all"
    >
      <RiskDot level={item.accountRiskLevel} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.account && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", riskColor(item.accountRiskLevel))}>
              {item.account}
            </span>
          )}
          <Badge className={cn("text-[10px]", callTypeColor(item.callType))}>{item.callType}</Badge>
          {item.date && <span className="text-[10px] text-muted-foreground">{formatDate(item.date)}</span>}
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px] group-hover:text-primary transition-colors">
            {item.transcriptTitle}
          </span>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}

function OwnerRow({ owner, isExpanded, onToggle }) {
  const urgencyColor =
    owner.highRiskCount >= 5 ? "text-red-600 bg-red-50 border-red-200"
    : owner.highRiskCount >= 2 ? "text-orange-600 bg-orange-50 border-orange-200"
    : "text-muted-foreground bg-muted border-border"

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
          {owner.owner.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{owner.owner}</p>
            {owner.highRiskCount > 0 && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", urgencyColor)}>
                {owner.highRiskCount} high-risk
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">{owner.totalItems} action items</span>
            {owner.affectedAccounts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {owner.affectedAccounts.length} account{owner.affectedAccounts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Load bar */}
        <div className="hidden sm:block w-24">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                owner.highRiskCount >= 5 ? "bg-red-500" : owner.highRiskCount >= 2 ? "bg-orange-500" : "bg-primary/60"
              )}
              style={{ width: `${Math.min(100, (owner.totalItems / 32) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{owner.totalItems} items</p>
        </div>

        <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          {owner.items.map((item, i) => <ActionItem key={i} item={item} />)}
        </div>
      )}
    </div>
  )
}

function AccountCommitmentsRow({ acct }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
          {acct.account.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{acct.account}</p>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize", riskColor(acct.riskLevel))}>
              {acct.riskLevel || '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {acct.totalItems} open commitments · {acct.owners.length} owner{acct.owners.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-black text-foreground">{acct.totalItems}</p>
          <p className="text-[10px] text-muted-foreground">items</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          <div className="flex gap-1 flex-wrap mb-2">
            {acct.owners.map(o => (
              <span key={o} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{o}</span>
            ))}
          </div>
          {acct.items.map((item, i) => <ActionItem key={i} item={item} />)}
        </div>
      )}
    </div>
  )
}

export default function Actions() {
  const [view, setView] = useState("owners") // "owners" | "accounts"
  const [expanded, setExpanded] = useState(null)
  const [showAll, setShowAll] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ["actions"], queryFn: api.actions })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
    </div>
  )

  const owners = data?.byOwner || []
  const accounts = data?.byAccount || []
  const displayedOwners = showAll ? owners : owners.slice(0, 15)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Action Item Accountability</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Commitments made across all 100 calls — who owns them and which accounts are still waiting
        </p>
      </div>

      {/* Insight banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {data?.totalItems} commitments made across 100 calls — none tracked to completion
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            {data?.highRiskItems} of these belong to critical or high-risk accounts. Every unresolved commitment
            to an at-risk customer is an open churn door.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Commitments" value={data?.totalItems} sub="across 100 calls" accent="border-border" />
        <StatCard label="Unique Owners" value={data?.totalOwners} sub="people responsible" accent="border-border" />
        <StatCard label="High-Risk Items" value={data?.highRiskItems} sub="on critical/high accounts" accent="border-orange-200" />
        <StatCard label="Accounts Waiting" value={data?.accountsWithCommitments} sub="with open commitments" accent="border-border" />
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("owners")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            view === "owners" ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40"
          )}
        >
          <User className="h-4 w-4" />
          By Owner
        </button>
        <button
          onClick={() => setView("accounts")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            view === "accounts" ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40"
          )}
        >
          <Building2 className="h-4 w-4" />
          By Account
        </button>
      </div>

      {/* Owner view */}
      {view === "owners" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            Ranked by total commitments. Red/orange badges = items assigned to critical or high-risk accounts.
          </p>
          {displayedOwners.map(owner => (
            <OwnerRow
              key={owner.owner}
              owner={owner}
              isExpanded={expanded === owner.owner}
              onToggle={() => setExpanded(expanded === owner.owner ? null : owner.owner)}
            />
          ))}
          {!showAll && owners.length > 15 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-xl hover:border-primary/40 transition-all"
            >
              Show {owners.length - 15} more owners
            </button>
          )}
        </div>
      )}

      {/* Account view */}
      {view === "accounts" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            Ranked by account risk score. Shows how many open commitments each customer is still waiting on.
          </p>
          {accounts.map(acct => (
            <AccountCommitmentsRow key={acct.account} acct={acct} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 flex-wrap">
        <p className="text-xs text-muted-foreground font-medium">Account risk:</p>
        {["critical", "high", "medium", "low"].map(level => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full inline-block",
              level === "critical" ? "bg-red-500" : level === "high" ? "bg-orange-500" : level === "medium" ? "bg-amber-500" : "bg-emerald-500"
            )} />
            <span className="text-xs text-muted-foreground capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
