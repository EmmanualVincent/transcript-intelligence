import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatScore(score) {
  if (score == null) return "—"
  return Number(score).toFixed(1)
}

export function sentimentColor(score) {
  if (score == null) return "text-muted-foreground"
  if (score >= 4.0) return "text-emerald-600"
  if (score >= 3.0) return "text-blue-600"
  if (score >= 2.0) return "text-amber-600"
  return "text-red-600"
}

export function sentimentBg(score) {
  if (score == null) return "bg-muted"
  if (score >= 4.0) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (score >= 3.0) return "bg-blue-50 text-blue-700 border-blue-200"
  if (score >= 2.0) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-red-50 text-red-700 border-red-200"
}

export function riskColor(level) {
  switch (level) {
    case "critical": return "bg-red-100 text-red-700 border-red-200"
    case "high": return "bg-orange-100 text-orange-700 border-orange-200"
    case "medium": return "bg-amber-100 text-amber-700 border-amber-200"
    case "low": return "bg-emerald-100 text-emerald-700 border-emerald-200"
    default: return "bg-muted text-muted-foreground border-border"
  }
}

export function riskBarColor(level) {
  switch (level) {
    case "critical": return "bg-red-500"
    case "high": return "bg-orange-500"
    case "medium": return "bg-amber-500"
    case "low": return "bg-emerald-500"
    default: return "bg-muted"
  }
}

export function categoryColor(cat) {
  const map = {
    incident: "bg-red-100 text-red-700 border-red-200",
    renewal: "bg-blue-100 text-blue-700 border-blue-200",
    compliance: "bg-violet-100 text-violet-700 border-violet-200",
    support: "bg-orange-100 text-orange-700 border-orange-200",
    product: "bg-cyan-100 text-cyan-700 border-cyan-200",
    competitive: "bg-rose-100 text-rose-700 border-rose-200",
    onboarding: "bg-teal-100 text-teal-700 border-teal-200",
    ops: "bg-gray-100 text-gray-700 border-gray-200",
  }
  return map[cat] || "bg-muted text-muted-foreground border-border"
}

export function callTypeColor(type) {
  const map = {
    internal: "bg-indigo-100 text-indigo-700 border-indigo-200",
    external: "bg-sky-100 text-sky-700 border-sky-200",
    support: "bg-orange-100 text-orange-700 border-orange-200",
  }
  return map[type] || "bg-muted text-muted-foreground"
}

export function momentTypeColor(type) {
  const map = {
    churn_signal: "bg-red-500",
    feature_gap: "bg-violet-500",
    concern: "bg-amber-500",
    positive_pivot: "bg-emerald-500",
    technical_issue: "bg-orange-500",
    praise: "bg-teal-500",
  }
  return map[type] || "bg-gray-400"
}

export function momentTypeBadge(type) {
  const map = {
    churn_signal: "bg-red-100 text-red-700 border-red-200",
    feature_gap: "bg-violet-100 text-violet-700 border-violet-200",
    concern: "bg-amber-100 text-amber-700 border-amber-200",
    positive_pivot: "bg-emerald-100 text-emerald-700 border-emerald-200",
    technical_issue: "bg-orange-100 text-orange-700 border-orange-200",
    praise: "bg-teal-100 text-teal-700 border-teal-200",
  }
  return map[type] || "bg-muted text-muted-foreground"
}

export function threadRoleLabel(role) {
  const map = {
    war_room: "War Room",
    remediation: "Remediation",
    root_cause: "Root Cause",
    escalation: "Escalation",
    customer_escalation: "Customer Escalation",
    customer_impact: "Customer Impact",
    postmortem: "Post-Mortem",
    review: "30-Day Review",
    reliability_sprint: "Reliability Sprint",
    support_ticket: "Support Ticket",
    customer_call: "Customer Call",
    internal: "Internal",
  }
  return map[role] || role
}

export function formatDate(dateStr) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return "today"
  if (diff === 1) return "1 day ago"
  return `${diff} days ago`
}

export function formatDuration(mins) {
  if (mins == null) return "—"
  const m = Math.round(mins)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

export function sentimentLabel(score) {
  if (score == null) return "Unknown"
  if (score >= 4.5) return "Very Positive"
  if (score >= 3.5) return "Positive"
  if (score >= 2.5) return "Mixed"
  if (score >= 1.5) return "Negative"
  return "Very Negative"
}
