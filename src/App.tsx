import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Heatmap } from './Heatmap'
import type { CryptoAsset, Currency, Timeframe } from './types'
import { INITIAL_WATCHLIST } from './types'
import { Loader2, DollarSign, Euro, Settings2, X, Search, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SpeedInsights } from '@vercel/speed-insights/react'

const queryClient = new QueryClient()

function MarketApp() {
  const [currency, setCurrency] = useState<Currency>('usd')
  const [timeframe, setTimeframe] = useState<Timeframe>('24h')
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('impeccable-watchlist-v3')
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST
  })
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastSync, setLastSync] = useState<string>('--:--:--')

  useEffect(() => {
    localStorage.setItem('impeccable-watchlist-v3', JSON.stringify(watchlist))
  }, [watchlist])

  const { data: assets, isLoading, isError, refetch } = useQuery({
    queryKey: ['marketData', currency, watchlist], // Key includes currency for instant accurate switch
    queryFn: async () => {
      try {
        const params: any = {
          vs_currency: currency,
          order: 'market_cap_desc',
          per_page: 250,
          sparkline: false,
          price_change_percentage: '1h,24h,7d,30d'
        }
        if (watchlist.length > 0) params.ids = watchlist.join(',')

        const response = await axios.get(`/api/market`, { params })
        
        setLastSync(new Date().toLocaleTimeString())
        
        return response.data.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          price: coin.current_price,
          change1h: coin.price_change_percentage_1h_in_currency || 0,
          change24h: coin.price_change_percentage_24h_in_currency || 0,
          change7d: coin.price_change_percentage_7d_in_currency || 0,
          change30d: coin.price_change_percentage_30d_in_currency || 0,
          marketCap: coin.market_cap,
          rank: coin.market_cap_rank,
          image: coin.image
        })) as CryptoAsset[]
      } catch (error) {
        const cached = localStorage.getItem('impeccable-fallback-data')
        if (cached) return JSON.parse(cached)
        throw error
      }
    },
    refetchInterval: 30000,
    staleTime: 0, // Force fresh data on currency/watchlist change
  })

  const toggleAsset = (id: string) => {
    setWatchlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [id, ...prev]
    )
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-white selection:text-black antialiased overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-[100]" />

      <div className="max-w-[2400px] mx-auto p-8 md:p-16 space-y-12 h-screen flex flex-col">
        {/* Navigation - Ultra High End */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.8em] font-black text-white/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_15px_rgba(16,185,129,1)]" />
              Institutional Core v6.0
            </div>
            <h1 className="text-7xl md:text-9xl font-serif italic font-extralight tracking-tighter leading-[0.8]">
              Impeccable <span className="not-italic font-medium text-white/90 text-6xl md:text-8xl">Market</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {/* Currency Selector - Fixed Engine */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-full border border-white/5 backdrop-blur-3xl">
              {(['usd', 'eur'] as const).map(curr => (
                <button 
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full text-[10px] uppercase tracking-[0.3em] font-black transition-all duration-500 ${currency === curr ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/20 hover:text-white'}`}
                >
                  {curr === 'usd' ? <DollarSign size={12} /> : <Euro size={12} />} {curr}
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-full border border-white/5 backdrop-blur-3xl">
              {(['1h', '24h', '7d', '30d'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.3em] font-black transition-all duration-500 ${timeframe === t ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/20 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Config Toggle */}
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white text-white hover:text-black transition-all duration-500"
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>

        {/* Intelligence Matrix */}
        <main className="flex-grow relative min-h-0">
          {isLoading && !assets ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-10 bg-white/[0.01] rounded-[4rem] border border-white/5">
              <Loader2 className="animate-spin text-white/5" size={80} strokeWidth={0.5} />
              <div className="text-[10px] uppercase tracking-[1.5em] font-black text-white/10 animate-pulse pl-4">Synthesizing Data</div>
            </div>
          ) : isError && !assets ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-8 text-center bg-white/[0.01] rounded-[4rem] border border-white/5">
              <div className="text-danger/40 uppercase tracking-[1em] font-black text-sm">Protocol Fault</div>
              <button onClick={() => refetch()} className="px-10 py-4 rounded-full border border-danger/20 text-danger text-[10px] uppercase font-black hover:bg-danger/10 transition-all">Manual Override</button>
            </div>
          ) : (
            <Heatmap data={assets || []} currency={currency} timeframe={timeframe} />
          )}
        </main>

        <footer className="flex justify-between items-center pt-8 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity duration-1000">
          <div className="flex gap-16 text-[9px] uppercase tracking-[0.6em] font-black text-white/20">
            <div className="flex items-center gap-3">LAST SYNC: <span className="text-success">{lastSync}</span></div>
            <div className="flex items-center gap-3">NODES: <span className="text-white">{watchlist.length || 250}</span></div>
          </div>
          <div className="flex gap-12 text-[9px] uppercase tracking-[0.6em] font-black text-white/20">
            {['Terminal', 'Privacy', 'Ecosystem'].map(l => <a key={l} href="#" className="hover:text-white transition-all">{l}</a>)}
          </div>
        </footer>
      </div>

      {/* COMMAND DRAWER - Absolute Perfection Manager */}
      <AnimatePresence>
        {isConfigOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsConfigOpen(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-[100px] z-[1000]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 40, stiffness: 250 }}
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#050505] border-l border-white/5 z-[1001] p-12 lg:p-20 shadow-[-50px_0_100px_rgba(0,0,0,1)] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-20">
                <div className="space-y-2">
                  <h2 className="text-6xl font-serif italic text-white tracking-tighter">Terminal</h2>
                  <p className="text-[10px] uppercase tracking-[0.5em] font-black text-white/20">Vector Grid Configuration</p>
                </div>
                <button onClick={() => setIsConfigOpen(false)} className="p-6 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-500 group">
                  <X size={28} className="text-white/20 group-hover:text-white" />
                </button>
              </div>

              <div className="space-y-16">
                {/* Search Engine */}
                <div className="relative group">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-white transition-all" size={24} />
                  <input 
                    type="text" placeholder="Search by CoinGecko ID (e.g. solana)..." 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] py-8 pl-20 pr-10 text-xl focus:outline-none focus:border-white/40 focus:bg-white/[0.05] transition-all duration-700 font-mono"
                  />
                </div>

                {/* Watchlist Purge */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20">Active Streams</span>
                    <button onClick={() => setWatchlist([])} className="text-[10px] uppercase tracking-widest font-black text-danger/40 hover:text-danger transition-all">Clear All</button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {watchlist.length === 0 ? (
                      <div className="p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center text-white/5 uppercase tracking-[0.5em] text-[10px]">Matrix Default: Top 250 Active</div>
                    ) : (
                      watchlist.map(id => (
                        <div key={id} className="flex justify-between items-center p-6 bg-white/[0.01] border border-white/5 rounded-3xl group hover:bg-white/[0.03] transition-all duration-500">
                          <span className="text-lg font-mono uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{id}</span>
                          <button onClick={() => toggleAsset(id)} className="p-3 rounded-full text-white/10 hover:text-danger hover:bg-danger/5 transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Rapid Add Result */}
                {searchTerm && (
                  <button 
                    onClick={() => { toggleAsset(searchTerm.toLowerCase()); setSearchTerm('') }}
                    className="w-full flex items-center justify-between p-10 bg-white text-black rounded-[2.5rem] hover:scale-[1.03] transition-all duration-700 shadow-2xl group"
                  >
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">Add Parameter</div>
                      <div className="text-3xl font-mono uppercase tracking-tighter font-black">{searchTerm}</div>
                    </div>
                    <Plus size={40} className="group-hover:rotate-90 transition-transform duration-700" />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SpeedInsights />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MarketApp />
    </QueryClientProvider>
  )
}
