import { useLocation, Link } from "react-router-dom"
import { ChevronRight, Sun, Moon } from "lucide-react"

const labels = {
  "": "Dashboard",
  "incidents": "Incident Thread",
  "transcripts": "Transcripts",
  "sentiment": "Sentiment Analysis",
  "accounts": "Account Health",
  "competitive": "Competitive Intelligence",
  "features": "Feature Gaps",
}

export function TopBar({ isDark, onToggleDark }) {
  const { pathname } = useLocation()
  const parts = pathname.split("/").filter(Boolean)

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex items-center px-6 gap-2">
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

      <div className="ml-auto">
        <button
          onClick={onToggleDark}
          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
