import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/layout/Sidebar"
import { Sun, Moon } from "lucide-react"
import Dashboard from "@/pages/Dashboard"
import Transcripts from "@/pages/Transcripts"
import TranscriptDetail from "@/pages/TranscriptDetail"
import Sentiment from "@/pages/Sentiment"
import Accounts from "@/pages/Accounts"
import AccountDetail from "@/pages/AccountDetail"
import Competitive from "@/pages/Competitive"
import Features from "@/pages/Features"
import Actions from "@/pages/Actions"
import Syncs from "@/pages/Syncs"
import ProductHealth from "@/pages/ProductHealth"
import SupportAnalytics from "@/pages/SupportAnalytics"
import { ChatWidget } from "@/components/ChatWidget"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-background">
          <button
            onClick={() => setIsDark(d => !d)}
            className="fixed top-4 right-4 z-50 h-8 w-8 flex items-center justify-center rounded-md bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shadow-sm"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
          <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${sidebarCollapsed ? "ml-16" : "ml-60"}`}>
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transcripts" element={<Transcripts />} />
                <Route path="/transcripts/:id" element={<TranscriptDetail />} />
                <Route path="/sentiment" element={<Sentiment />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/accounts/:name" element={<AccountDetail />} />
                <Route path="/competitive" element={<Competitive />} />
                <Route path="/product-intel" element={<Features />} />
                <Route path="/actions" element={<Actions />} />
                <Route path="/syncs" element={<Syncs />} />
                <Route path="/product-health" element={<ProductHealth />} />
                <Route path="/support-analytics" element={<SupportAnalytics />} />
              </Routes>
            </main>
          </div>
        </div>
        <ChatWidget />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
