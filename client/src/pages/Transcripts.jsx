import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn, callTypeColor, categoryColor, formatScore, sentimentBg, formatDate, formatDuration } from "@/lib/utils"
import { Search, ChevronRight, ChevronLeft, Clock, Users } from "lucide-react"

const CALL_TYPES = ["", "internal", "external", "support"]
const CATEGORIES = ["", "incident", "renewal", "compliance", "support", "product", "competitive", "onboarding", "ops"]
const SENTIMENT_FILTERS = [
  { value: "", label: "All Sentiment" },
  { value: "lt:2", label: "Very Negative (< 2)" },
  { value: "lt:3", label: "Negative (< 3)" },
  { value: "gt:3.5", label: "Positive (> 3.5)" },
  { value: "gt:4", label: "Very Positive (> 4)" },
]

export default function Transcripts() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ callType: "", category: "", sentiment: "", search: "" })
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [searchTimeout, setSearchTimeout] = useState(null)

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function handleSearchChange(e) {
    const v = e.target.value
    setFilters(f => ({ ...f, search: v }))
    clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 300))
  }

  const { data, isLoading } = useQuery({
    queryKey: ["transcripts", filters.callType, filters.category, filters.sentiment, debouncedSearch, page],
    queryFn: () => api.transcripts({
      callType: filters.callType || undefined,
      category: filters.category || undefined,
      sentiment: filters.sentiment || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: 25,
    }),
    keepPreviousData: true,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transcript Explorer</h1>
        <p className="text-muted-foreground text-sm mt-1">Search, filter, and explore all 101 call transcripts</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search titles, topics, accounts…"
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
            <Select value={filters.callType} onChange={e => setFilter("callType", e.target.value)} className="w-36">
              {CALL_TYPES.map(v => (
                <option key={v} value={v}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : "All Types"}</option>
              ))}
            </Select>
            <Select value={filters.category} onChange={e => setFilter("category", e.target.value)} className="w-36">
              {CATEGORIES.map(v => (
                <option key={v} value={v}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : "All Categories"}</option>
              ))}
            </Select>
            <Select value={filters.sentiment} onChange={e => setFilter("sentiment", e.target.value)} className="w-48">
              {SENTIMENT_FILTERS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            {(filters.callType || filters.category || filters.sentiment || filters.search) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setFilters({ callType: "", category: "", sentiment: "", search: "" })
                setDebouncedSearch("")
                setPage(1)
              }}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.total)} of <span className="font-medium text-foreground">{data.total}</span> transcripts
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          [...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          data?.transcripts?.map(t => (
            <Link key={t.id} to={`/transcripts/${t.id}`} className="block">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge className={cn("text-xs", callTypeColor(t.callType))}>{t.callType}</Badge>
                        <Badge className={cn("text-xs", categoryColor(t.category))}>{t.category}</Badge>
                        {t.customerAccount && (
                          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                            {t.customerAccount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {t.title}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(t.startTime)} · {formatDuration(t.duration)}
                        </span>
                        {t.speakers?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {t.speakers.slice(0, 2).join(", ")}{t.speakers.length > 2 ? ` +${t.speakers.length - 2}` : ""}
                          </span>
                        )}
                        {(t.keyMoments?.length > 0) && (
                          <span className="text-xs text-muted-foreground">
                            {t.keyMoments.filter(k => k.type === "churn_signal").length > 0 && (
                              <span className="text-red-600 font-medium">{t.keyMoments.filter(k => k.type === "churn_signal").length} churn signal{t.keyMoments.filter(k => k.type === "churn_signal").length > 1 ? "s" : ""} · </span>
                            )}
                            {t.keyMoments.length} moments
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold", sentimentBg(t.sentimentScore))}>
                        {formatScore(t.sentimentScore)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {data.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
