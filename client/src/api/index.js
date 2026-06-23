const BASE = '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  overview: () => get('/overview'),
  transcripts: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v != null && v !== '' && q.set(k, v))
    return get(`/transcripts?${q}`)
  },
  transcript: (id) => get(`/transcripts/${id}`),
  sentimentTimeline: () => get('/sentiment/timeline'),
  sentimentByCategory: () => get('/sentiment/by-category'),
  sentimentByTopic: () => get('/sentiment/by-topic'),
  sentimentDivergence: () => get('/sentiment/divergence'),
  accounts: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v != null && v !== '' && q.set(k, v))
    return get(`/accounts?${q}`)
  },
  account: (name) => get(`/accounts/${encodeURIComponent(name)}`),
  competitive: () => get('/competitive'),
  competitor: (name) => get(`/competitive/${encodeURIComponent(name)}`),
  incidents: () => get('/incidents'),
  features: () => get('/features'),
  actions: () => get('/actions'),
  syncs: () => get('/syncs'),
  productHealth: () => get('/product-health'),
  supportAnalytics: () => get('/support-analytics'),
}
