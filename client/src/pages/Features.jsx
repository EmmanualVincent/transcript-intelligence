import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatDate } from "@/lib/utils"
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

const AREA_COLORS = {
  Identity: "from-violet-500 to-purple-600",
  Comply: "from-blue-500 to-indigo-600",
  Detect: "from-red-500 to-rose-600",
  Protect: "from-emerald-500 to-teal-600",
  LogVault: "from-cyan-500 to-sky-600",
  Platform: "from-gray-500 to-gray-600",
}

const AREA_BG = {
  Identity: "bg-violet-50 border-violet-200",
  Comply: "bg-blue-50 border-blue-200",
  Detect: "bg-red-50 border-red-200",
  Protect: "bg-emerald-50 border-emerald-200",
  LogVault: "bg-cyan-50 border-cyan-200",
  Platform: "bg-gray-50 border-gray-200",
}

function GapItem({ gap }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3.5 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed">{gap.description}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">{gap.mentions} mention{gap.mentions > 1 ? "s" : ""}</span>
            <div className="flex gap-1 flex-wrap">
              {(gap.accounts || []).map(acc => (
                <Link key={acc} to={`/accounts/${encodeURIComponent(acc)}`} onClick={e => e.stopPropagation()}>
                  <Badge className="text-[10px] bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">{acc}</Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <div className="text-center">
            <p className="text-sm font-black">{gap.mentions}</p>
            <p className="text-[10px] text-muted-foreground">requests</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && gap.transcripts?.length > 0 && (
        <div className="border-t border-border bg-muted/30 p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">Mentioned in:</p>
          {gap.transcripts.map((tr, i) => (
            <Link key={i} to={`/transcripts/${tr.id}`} className="flex items-center gap-2 text-xs hover:text-primary transition-colors group">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground group-hover:bg-primary transition-colors flex-shrink-0" />
              <span className="line-clamp-1 flex-1">{tr.title}</span>
              <span className="text-muted-foreground flex-shrink-0">{formatDate(tr.date)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Features() {
  const { data, isLoading } = useQuery({ queryKey: ["features"], queryFn: api.features })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
    </div>
  )

  const { areas = [], totalGaps } = data || {}

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Gap Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalGaps} feature gaps from customer conversations — a customer-validated backlog with account names attached
        </p>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-violet-800">For Product Managers</p>
          <p className="text-sm text-violet-700 mt-0.5">
            These gaps emerged organically in renewal, support, and onboarding calls — customers naming what they need in their own words, with business context no survey captures. Each gap links directly to the transcript where it was raised.
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {areas.map(area => (
          <a key={area.area} href={`#${area.area}`} className={cn("rounded-xl border p-3 hover:shadow-sm transition-all text-center", AREA_BG[area.area] || "bg-muted border-border")}>
            <p className="text-lg font-black">{area.totalMentions}</p>
            <p className="text-xs font-medium">{area.area}</p>
          </a>
        ))}
      </div>

      {/* Areas */}
      {areas.map(area => (
        <Card key={area.area} id={area.area}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex-shrink-0 flex items-center justify-center", AREA_COLORS[area.area] || "from-gray-400 to-gray-600")}>
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle>{area.area}</CardTitle>
                <CardDescription>
                  {area.gaps.length} distinct gap{area.gaps.length > 1 ? "s" : ""} · {area.totalMentions} total mentions
                </CardDescription>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-black">{area.totalMentions}</p>
                <p className="text-xs text-muted-foreground">requests</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {area.gaps.map((gap, i) => (
              <GapItem key={i} gap={gap} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
