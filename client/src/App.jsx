import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/layout/Sidebar"
import Dashboard from "@/pages/Dashboard"
import Transcripts from "@/pages/Transcripts"
import TranscriptDetail from "@/pages/TranscriptDetail"
import Sentiment from "@/pages/Sentiment"
import Accounts from "@/pages/Accounts"
import AccountDetail from "@/pages/AccountDetail"
import Competitive from "@/pages/Competitive"
import Features from "@/pages/Features"
import Actions from "@/pages/Actions"
import RevenueRisk from "@/pages/RevenueRisk"
import Syncs from "@/pages/Syncs"
import ProductHealth from "@/pages/ProductHealth"
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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex-1 ml-60 flex flex-col min-h-screen">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transcripts" element={<Transcripts />} />
                <Route path="/transcripts/:id" element={<TranscriptDetail />} />
                <Route path="/sentiment" element={<Sentiment />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/accounts/:name" element={<AccountDetail />} />
                <Route path="/competitive" element={<Competitive />} />
                <Route path="/features" element={<Features />} />
                <Route path="/actions" element={<Actions />} />
                <Route path="/revenue-risk" element={<RevenueRisk />} />
                <Route path="/syncs" element={<Syncs />} />
                <Route path="/product-health" element={<ProductHealth />} />
              </Routes>
            </main>
          </div>
        </div>
        <ChatWidget />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
