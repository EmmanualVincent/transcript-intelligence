import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  cn, callTypeColor, categoryColor, sentimentBg, formatScore, formatDate,
  formatDuration, momentTypeBadge, momentTypeColor
} from "@/lib/utils"
import { ArrowLeft, Clock, Users, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

function SentimentDot({ type }) {
  const colors = {
    positive: "bg-emerald-500",
    "very-positive": "bg-emerald-600",
    negative: "bg-red-500",
    "very-negative": "bg-red-600",
    "mixed-negative": "bg-amber-500",
    "mixed-positive": "bg-blue-400",
    neutral: "bg-gray-300",
  }
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5", colors[type] || "bg-gray-200")} />
}

function SpeakerBadge({ name }) {
  const colors = [
    "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300",
    "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300",
    "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
    "bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300",
    "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300",
  ]
  const idx = (name?.charCodeAt(0) || 0) % colors.length
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0", colors[idx])}>
      {name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
    </span>
  )
}

export default function TranscriptDetail() {
  const { id } = useParams()
  const { data: t, isLoading, error } = useQuery({
    queryKey: ["transcript", id],
    queryFn: () => api.transcript(id),
  })
  const [showFull, setShowFull] = useState(false)
  const [filterMoment, setFilterMoment] = useState(null)

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  )
  if (error) return <div className="p-6 text-red-600">Failed to load transcript.</div>
  if (!t) return null

  const utterances = t.utterances || []
  const displayed = showFull ? utterances : utterances.slice(0, 40)

  const churnSignals = (t.keyMoments || []).filter(k => k.type === "churn_signal")
  const featureGaps = (t.keyMoments || []).filter(k => k.type === "feature_gap")
  const momentTypes = [...new Set((t.keyMoments || []).map(k => k.type))]

  const totalTalkTime = Object.values(t.speakerStats || {}).reduce((s, sp) => s + sp.totalDuration, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Back */}
      <Link to="/transcripts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Transcripts
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <Badge className={cn("text-xs", callTypeColor(t.callType))}>{t.callType}</Badge>
          <Badge className={cn("text-xs", categoryColor(t.category))}>{t.category}</Badge>
          {t.customerAccount && (
            <Link to={`/accounts/${encodeURIComponent(t.customerAccount)}`}>
              <Badge className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer">
                {t.customerAccount}
              </Badge>
            </Link>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{t.title}</h1>
        <div className="flex items-center gap-5 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(t.startTime)} · {formatDuration(t.duration)}
          </span>
          {t.speakers?.length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t.speakers.join(", ")}
            </span>
          )}
          <div className={cn("px-2.5 py-1 rounded-lg border text-sm font-bold", sentimentBg(t.sentimentScore))}>
            Sentiment: {formatScore(t.sentimentScore)} · {t.overallSentiment}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Summary + Key moments */}
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.summary}</p>
            </CardContent>
          </Card>

          {/* Action items */}
          {t.actionItems?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Action Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Speaker talk time */}
          {Object.keys(t.speakerStats || {}).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Speaker Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {Object.entries(t.speakerStats)
                  .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
                  .map(([name, stats]) => {
                    const pct = totalTalkTime > 0 ? (stats.totalDuration / totalTalkTime * 100).toFixed(0) : 0
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{name}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Key moments + Transcript */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key Moments */}
          {t.keyMoments?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Key Moments ({t.keyMoments.length})</CardTitle>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setFilterMoment(null)}
                      className={cn("text-xs px-2 py-0.5 rounded-full border transition-colors",
                        filterMoment === null ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"
                      )}
                    >All</button>
                    {momentTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setFilterMoment(filterMoment === type ? null : type)}
                        className={cn("text-xs px-2 py-0.5 rounded-full border transition-colors",
                          filterMoment === type ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"
                        )}
                      >
                        {type.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Visual timeline */}
                <div className="relative h-6 bg-muted rounded-full overflow-hidden mt-2">
                  {t.keyMoments.map((km, i) => {
                    const totalSecs = (t.duration || 60) * 60
                    const pct = ((km.time || 0) / totalSecs * 100).toFixed(1)
                    return (
                      <div
                        key={i}
                        className={cn("absolute top-1 bottom-1 w-1.5 rounded-full", momentTypeColor(km.type))}
                        style={{ left: `${pct}%` }}
                        title={`${km.type}: ${km.text?.slice(0, 80)}`}
                      />
                    )
                  })}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {t.keyMoments
                  .filter(km => filterMoment === null || km.type === filterMoment)
                  .map((km, i) => (
                    <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg border", momentTypeBadge(km.type).replace("text-", "border-").replace("bg-", "bg-opacity-30 border-"))}>
                      <div className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0", momentTypeColor(km.type))} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className={cn("text-[10px]", momentTypeBadge(km.type))}>
                            {km.type?.replace("_", " ")}
                          </Badge>
                          {km.speaker && <span className="text-[10px] text-muted-foreground">{km.speaker}</span>}
                          {km.time != null && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {Math.floor(km.time / 60)}:{String(Math.round(km.time % 60)).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{km.text}</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {utterances.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Full Transcript ({utterances.length} utterances)</CardTitle>
                <p className="text-xs text-muted-foreground">Color indicates utterance sentiment</p>
              </CardHeader>
              <CardContent className="space-y-1">
                {displayed.map((u, i) => {
                  const name = u.speaker_name || u.speaker || "Unknown"
                  const sentType = u.sentimentType || u.sentiment_type || "neutral"
                  const bg = {
                    positive: "bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-emerald-300 dark:border-emerald-700",
                    "very-positive": "bg-emerald-100 dark:bg-emerald-950/50 border-l-2 border-emerald-400 dark:border-emerald-600",
                    negative: "bg-red-50 dark:bg-red-950/30 border-l-2 border-red-300 dark:border-red-700",
                    "very-negative": "bg-red-100 dark:bg-red-950/50 border-l-2 border-red-400 dark:border-red-600",
                    "mixed-negative": "bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-300 dark:border-amber-700",
                    "mixed-positive": "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-200 dark:border-blue-800",
                    neutral: "",
                  }[sentType] || ""

                  return (
                    <div key={i} className={cn("flex items-start gap-2.5 px-2 py-1.5 rounded-r-lg text-sm", bg)}>
                      <SpeakerBadge name={name} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-muted-foreground mr-2">{name}</span>
                        <span className="text-xs text-foreground leading-relaxed">{u.sentence}</span>
                      </div>
                      <SentimentDot type={sentType} />
                    </div>
                  )
                })}
                {utterances.length > 40 && (
                  <button
                    onClick={() => setShowFull(!showFull)}
                    className="w-full text-center py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1 mt-2"
                  >
                    {showFull ? (
                      <><ChevronUp className="h-4 w-4" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Show all {utterances.length} utterances</>
                    )}
                  </button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
