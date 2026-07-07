import { AlertCircle, Clock, Eye, CheckCircle } from "lucide-react"

// Action tier derived from an account's risk signals. Mirrors the server's
// tier logic; kept here so Accounts + AccountDetail agree on one definition.
export function classifyTier(account) {
  const hasRenewal = account.hasUpcomingRenewal
  const hasChurn   = account.churnSignalCount >= 1
  const hasComp    = (account.competitorMentions ?? account.competitors?.length ?? 0) >= 1
  const signals    = [hasRenewal, hasChurn, hasComp].filter(Boolean).length
  if (signals === 3) return "act_now"
  if (signals === 2) return "act_soon"
  if (account.riskLevel === "critical" || (account.riskLevel === "high" && account.churnSignalCount >= 2)) return "watch"
  return "safe"
}

export const TIER_CONFIG = {
  act_now:  { label: "Act Now",       icon: AlertCircle, className: "bg-red-100 text-red-700 border-red-300" },
  act_soon: { label: "Act Soon",      icon: Clock,       className: "bg-orange-100 text-orange-700 border-orange-300" },
  watch:    { label: "Watch Closely", icon: Eye,         className: "bg-amber-100 text-amber-700 border-amber-300" },
  safe:     { label: "Safe",          icon: CheckCircle, className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
}
