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
  ChevronLeft,
  ChevronRight,
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

export function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 bg-background border-r border-border flex flex-col transition-[width] duration-300 ease-in-out",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="px-3 py-5 border-b border-border flex items-center gap-2.5 overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-300",
          collapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
        )}>
          <p className="text-sm font-semibold text-foreground leading-none">Transcript</p>
          <p className="text-xs text-muted-foreground mt-0.5">Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className={cn(
              "flex-1 overflow-hidden whitespace-nowrap transition-all duration-300",
              collapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
            )}>{label}</span>
            {badge === "hot" && (
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wide bg-red-500 text-white rounded-full transition-all duration-300 overflow-hidden whitespace-nowrap",
                collapsed ? "max-w-0 opacity-0 px-0 py-0" : "max-w-xs opacity-100 px-1.5 py-0.5"
              )}>
                Live
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer: company context + toggle */}
      <div className="border-t border-border p-3 flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-2.5 bg-muted rounded-lg overflow-hidden transition-all duration-300 min-w-0",
          collapsed ? "max-w-0 opacity-0 px-0 py-0" : "flex-1 opacity-100 px-3 py-2"
        )}>
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">AegisCloud</p>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">B2B Cybersecurity</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
