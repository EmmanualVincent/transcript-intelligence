import { useLocation, Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

const labels = {
  "": "Dashboard",
  "incidents": "Incident Thread",
  "transcripts": "Transcripts",
  "sentiment": "Sentiment Analysis",
  "accounts": "Account Health",
  "competitive": "Competitive Intelligence",
  "features": "Feature Gaps",
}

export function TopBar() {
  const { pathname } = useLocation()
  const parts = pathname.split("/").filter(Boolean)

  return (
    <header className="h-14 border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-20 flex items-center px-6 gap-2">
      <Link to="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        Home
      </Link>
      {parts.map((part, i) => {
        const label = labels[part] || decodeURIComponent(part)
        const to = "/" + parts.slice(0, i + 1).join("/")
        return (
          <span key={i} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            {i === parts.length - 1 ? (
              <span className="text-sm font-medium text-foreground">{label}</span>
            ) : (
              <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </header>
  )
}
