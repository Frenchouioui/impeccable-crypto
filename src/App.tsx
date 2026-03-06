import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Heatmap } from './Heatmap'
import type { CryptoAsset, Currency, Timeframe } from './types'
import { INITIAL_WATCHLIST } from './types'
import { Search, Plus, X, DollarSign, Euro, Settings2, Loader2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const queryClient = new QueryClient()

function MarketApp() {
  const [currency, setCurrency] = useState<Currency>('usd')
  const [timeframe, setTimeframe] = useState<Timeframe>('24h')
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('impeccable-watchlist')
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [lastSync, setLastSync] = useState<string>('--:--:--')

  useEffect(() => {
    localStorage.setItem('impeccable-watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  const { data: assets, isLoading, isError, refetch } = useQuery({
    queryKey: ['marketData', currency, watchlist],
    queryFn: async () => {
      try {
        const params: any = {
          vs_currency: currency,
          order: 'market_cap_desc',
          per_page: 250,
          sparkline: false,
          price_change_percentage: '1h,24h,7d,30d'
        }

        const validWatchlist = watchlist.filter(id => id.trim() !== '')
        if (validWatchlist.length > 0) {
          params.ids = validWatchlist.join(',')
        }

        // ABSOLUTE CORS FIX: Explicit relative path
        const response = await axios.get(`/api/market`, { params })
        
        const mappedData = response.data.map((coin: any) => ({
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
        }))
        
        setLastSync(new Date().toLocaleTimeString())
        localStorage.setItem('impeccable-fallback-data', JSON.stringify(mappedData))
        return mappedData as CryptoAsset[]
      } catch (error: any) {
        const cached = localStorage.getItem('impeccable-fallback-data')
        if (cached) return JSON.parse(cached) as CryptoAsset[]
        throw error
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const toggleAsset = (id: string) => {
    const cleanId = id.trim().toLowerCase()
    if (!cleanId) return
    setWatchlist(prev => 
      prev.includes(cleanId) ? prev.filter(item => item !== cleanId) : [...prev, cleanId]
    )
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-white selection:text-black antialiased overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-[9000]" />

      <div className="max-w-[2000px] mx-auto p-8 md:p-24 space-y-20">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-20">
          <div className="space-y-8">
            <div className="flex items-center gap-5 text-[12px] uppercase tracking-[0.8em] font-black text-white/20">
              <span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_30px_rgba(16,185,129,1)] animate-pulse" />
              Institutional Nexus v5.0
            </div>
            <h1 className="text-7xl md:text-[12rem] font-serif italic font-extralight tracking-tighter leading-[0.75]">
              Impeccable <span className="not-italic font-medium text-white/90">Market</span>
            </h1>
          </div>

          <div className="flex flex-col items-end gap-10">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-full border border-white/5 backdrop-blur-3xl">
                {(['usd', 'eur'] as const).map(curr => (
                  <button 
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`flex items-center gap-4 px-12 py-4 rounded-full text-[12px] uppercase tracking-[0.4em] font-black transition-all duration-1000 ${currency === curr ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/20 hover:text-white'}`}
                  >
                    {curr === 'usd' ? <DollarSign size={14} /> : <Euro size={14} />} {curr}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-full border border-white/5 backdrop-blur-3xl">
                {(['1h', '24h', '7d', '30d'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-8 py-4 rounded-full text-[12px] uppercase tracking-[0.4em] font-black transition-all duration-1000 ${timeframe === t ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/20 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row justify-between items-center gap-16 border-y border-white/5 py-16">
          <div className="flex flex-wrap gap-32">
            <div className="space-y-3">
              <div className="text-[12px] uppercase tracking-[0.5em] font-black text-white/10">Synchronized Node</div>
              <div className="text-2xl font-mono tracking-tighter text-success">{lastSync}</div>
            </div>
            <div className="space-y-3">
              <div className="text-[12px] uppercase tracking-[0.5em] font-black text-white/10">Active Flux</div>
              <div className="text-2xl font-mono tracking-tighter">{watchlist.length || 250} Vectors</div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="group flex items-center gap-8 px-16 py-8 rounded-full bg-white text-black hover:bg-zinc-200 transition-all duration-1000 text-[12px] uppercase tracking-[0.5em] font-black shadow-[0_40px_80px_rgba(255,255,255,0.15)] hover:translate-y-[-6px]"
          >
            <Settings2 size={18} /> 
            Vector Grid Config
            <ArrowRight size={18} className="group-hover:translate-x-3 transition-transform duration-700" />
          </button>
        </div>

        <main className="relative">
          {isLoading && !assets ? (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-12 bg-white/[0.01] rounded-[5rem] border border-white/5">
              <Loader2 className="animate-spin text-white/5" size={100} strokeWidth={0.5} />
              <div className="text-[12px] uppercase tracking-[1.5em] font-black text-white/10 animate-pulse">Establishing Nexus</div>
            </div>
          ) : isError && !assets ? (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-12 bg-white/[0.01] rounded-[5rem] border border-white/5 text-center">
              <div className="space-y-6">
                <div className="text-danger/40 uppercase tracking-[1em] font-black text-lg pl-4">Critical Fault</div>
                <div className="text-[11px] text-white/10 uppercase tracking-[0.5em]">Rate Limit: Cooling Node</div>
              </div>
              <button 
                onClick={() => refetch()}
                className="px-16 py-5 rounded-full border border-danger/20 hover:bg-danger/10 text-[12px] uppercase tracking-[0.4em] font-black text-danger transition-all duration-1000 hover:scale-105"
              >
                Reset Nexus Protocol
              </button>
            </div>
          ) : (
            <Heatmap data={assets || []} currency={currency} timeframe={timeframe} />
          )}
        </main>

        <footer className="pt-32 pb-16 flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-20 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity duration-1000">
          <div className="space-y-8">
            <div className="text-5xl font-serif italic tracking-tighter">Impeccable Style.</div>
            <div className="flex gap-20 text-[12px] uppercase tracking-[0.6em] font-black text-white/10">
              <span>© 2026 NEXUS</span>
              <span>GENEVA TERMINAL</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-20 text-[12px] uppercase tracking-[0.6em] font-black text-white/30">
            {['GitHub', 'Terminal API', 'Privacy Protocol', 'Institutional', 'Dark Mode'].map(link => (
              <a key={link} href="#" className="hover:text-white transition-all duration-1000 border-b border-white/0 hover:border-white/40 pb-3">{link}</a>
            ))}
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/99 backdrop-blur-[150px] z-[11000]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 40, stiffness: 200, mass: 1 }}
              className="fixed top-0 right-0 h-full w-full max-w-3xl bg-[#030303] border-l border-white/5 z-[11001] p-20 lg:p-32 shadow-[-100px_0_200px_rgba(0,0,0,1)] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-32">
                <div className="space-y-3">
                  <h2 className="text-7xl font-serif italic tracking-tighter">Nexus Config</h2>
                  <div className="text-[12px] uppercase tracking-[0.6em] font-black text-white/10">Synchronized Vector Parameters</div>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-8 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-1000 group">
                  <X size={32} className="text-white/20 group-hover:text-white transition-colors" />
                </button>
              </div>

              <div className="space-y-24">
                <div className="relative group">
                  <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-white transition-all duration-1000" size={28} />
                  <input 
                    type="text" 
                    placeholder="Input Vector Identity..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/[0.01] border border-white/10 rounded-[3rem] py-10 pl-24 pr-12 text-2xl focus:outline-none focus:border-white/40 focus:bg-white/[0.03] transition-all duration-1000 placeholder:text-white/5 font-mono tracking-tighter"
                  />
                </div>

                <div className="space-y-12">
                  <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="text-[12px] uppercase tracking-[0.6em] font-black text-white/10">Active Vectors</div>
                    <button 
                      onClick={() => setWatchlist([])}
                      className="text-[12px] uppercase tracking-widest font-black text-danger/40 hover:text-danger transition-all duration-1000"
                    >
                      Purge Nexus
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-5">
                    {watchlist.length === 0 ? (
                      <div className="p-32 border-2 border-dashed border-white/5 rounded-[4rem] text-center space-y-6">
                        <div className="text-[12px] uppercase tracking-[0.8em] font-black text-white/5">Full Grid Matrix Active</div>
                      </div>
                    ) : (
                      watchlist.map(id => (
                        <div key={id} className="flex justify-between items-center p-10 bg-white/[0.01] border border-white/5 rounded-[3rem] hover:bg-white/[0.03] hover:border-white/20 transition-all duration-1000 group">
                          <span className="text-xl font-mono uppercase tracking-[0.2em] opacity-30 group-hover:opacity-100 transition-all duration-1000">{id}</span>
                          <button onClick={() => toggleAsset(id)} className="p-4 text-white/10 hover:text-danger hover:bg-danger/5 rounded-full transition-all duration-1000">
                            <X size={24} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {search && (
                  <div className="pt-16 space-y-10">
                    <div className="text-[12px] uppercase tracking-[0.6em] font-black text-white/10">Discovery Phase</div>
                    <button 
                      onClick={() => {
                        toggleAsset(search.toLowerCase())
                        setSearch('')
                      }}
                      className="w-full flex items-center justify-between p-12 bg-white text-black rounded-[4rem] hover:scale-[1.05] transition-all duration-1000 shadow-[0_50px_100px_rgba(255,255,255,0.2)] group"
                    >
                      <div className="text-left space-y-2">
                        <div className="text-[12px] uppercase tracking-[0.4em] font-black opacity-30">Inject to Nexus</div>
                        <div className="text-3xl font-mono uppercase tracking-tighter font-black">{search}</div>
                      </div>
                      <Plus size={40} className="group-hover:rotate-180 transition-transform duration-1000" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
