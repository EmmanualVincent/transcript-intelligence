import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Building2,
  Swords,
  Zap,
  Lightbulb,
  ClipboardList,
  MonitorCheck,
  Activity,
} from "lucide-react"

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/transcripts", label: "Transcripts", icon: FileText },
  { to: "/sentiment", label: "Sentiment", icon: TrendingUp },
  { to: "/accounts", label: "Account Health", icon: Building2 },
  { to: "/competitive", label: "Competitive Intel", icon: Swords },
  { to: "/features", label: "Feature Gaps", icon: Lightbulb },
  { to: "/actions", label: "Action Owners", icon: ClipboardList },
  { to: "/syncs", label: "Internal Syncs", icon: MonitorCheck },
  { to: "/product-health", label: "Product Health", icon: Activity },
]

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Transcript</p>
            <p className="text-xs text-muted-foreground mt-0.5">Intelligence</p>
          </div>
        </div>
      </div>

      {/* Company context */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5 bg-muted rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">AegisCloud</p>
            <p className="text-[10px] text-muted-foreground">B2B Cybersecurity</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">Analysis</p>
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge === "hot" && (
              <span className="text-[9px] font-bold uppercase tracking-wide bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                Live
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">100 transcripts · Feb–Apr 2026</p>
      </div>
    </aside>
  )
}
