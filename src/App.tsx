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

        const response = await axios.get(
          `/api/market`, { params }
        )
        
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
    <div className="min-h-screen bg-[#020202] text-white selection:bg-white selection:text-black antialiased">
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50" />

      <div className="max-w-[1920px] mx-auto p-8 md:p-20 space-y-16">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-16">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.6em] font-black text-white/30">
              <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse" />
              Institutional Core v4.0
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-serif italic font-extralight tracking-tighter leading-none">
              Impeccable <span className="not-italic font-medium text-white/90">Market</span>
            </h1>
          </div>

          <div className="flex flex-col items-end gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Currency Selector */}
              <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-3xl">
                {(['usd', 'eur'] as const).map(curr => (
                  <button 
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`flex items-center gap-3 px-10 py-3.5 rounded-full text-[11px] uppercase tracking-[0.3em] font-black transition-all duration-700 ${currency === curr ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/30 hover:text-white'}`}
                  >
                    {curr === 'usd' ? <DollarSign size={13} /> : <Euro size={13} />} {curr}
                  </button>
                ))}
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-3xl">
                {(['1h', '24h', '7d', '30d'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-6 py-3.5 rounded-full text-[11px] uppercase tracking-[0.3em] font-black transition-all duration-700 ${timeframe === t ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/30 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row justify-between items-center gap-12 border-y border-white/5 py-12">
          <div className="flex gap-24">
            <div className="space-y-2 text-center lg:text-left">
              <div className="text-[11px] uppercase tracking-widest font-black text-white/20">Market Horizon</div>
              <div className="text-xl font-mono tracking-tighter text-success">{timeframe} Performance</div>
            </div>
            <div className="space-y-2 text-center lg:text-left">
              <div className="text-[11px] uppercase tracking-widest font-black text-white/20">Protocol Status</div>
              <div className="text-xl font-mono tracking-tighter">{watchlist.length || 250} Active Streams</div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="group flex items-center gap-6 px-14 py-6 rounded-full bg-white text-black hover:bg-zinc-200 transition-all duration-700 text-[11px] uppercase tracking-[0.4em] font-black shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:translate-y-[-4px]"
          >
            <Settings2 size={16} /> 
            Terminal Configuration
            <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-500" />
          </button>
        </div>

        <main className="relative">
          {isLoading && !assets ? (
            <div className="h-[78vh] flex flex-col items-center justify-center gap-10 bg-white/[0.01] rounded-[4rem] border border-white/5">
              <Loader2 className="animate-spin text-white/10" size={80} strokeWidth={1} />
              <div className="text-[11px] uppercase tracking-[1em] font-black text-white/20 animate-pulse">Establishing Connection</div>
            </div>
          ) : isError && !assets ? (
            <div className="h-[78vh] flex flex-col items-center justify-center gap-10 bg-white/[0.01] rounded-[4rem] border border-white/5 text-center">
              <div className="space-y-4">
                <div className="text-danger/40 uppercase tracking-[0.6em] font-black text-sm">System Interface Fault</div>
                <div className="text-[10px] text-white/20 uppercase tracking-[0.3em]">Rate Limit: Cooling Down Phase</div>
              </div>
              <button 
                onClick={() => refetch()}
                className="px-12 py-4 rounded-full border border-danger/20 hover:bg-danger/10 text-[11px] uppercase tracking-widest font-black text-danger transition-all duration-700 hover:scale-105"
              >
                Force Re-Authentication
              </button>
            </div>
          ) : (
            <Heatmap data={assets || []} currency={currency} timeframe={timeframe} />
          )}
        </main>

        <footer className="pt-24 pb-12 flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-16 border-t border-white/5">
          <div className="space-y-6">
            <div className="text-4xl font-serif italic opacity-90 tracking-tighter">Impeccable Style.</div>
            <div className="flex gap-16 text-[11px] uppercase tracking-[0.5em] font-black text-white/10">
              <span>© 2026 PROD</span>
              <span>GENEVA TERMINAL</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-16 text-[11px] uppercase tracking-[0.5em] font-black text-white/30">
            {['GitHub', 'Terminal API', 'Privacy Protocol', 'Institutional', 'Dark Mode'].map(link => (
              <a key={link} href="#" className="hover:text-white transition-all duration-700 border-b border-white/0 hover:border-white/40 pb-2">{link}</a>
            ))}
          </div>
        </footer>
      </div>

      {/* Configuration Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/98 backdrop-blur-[100px] z-[1000]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 35, stiffness: 250, mass: 1 }}
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#050505] border-l border-white/5 z-[1001] p-16 lg:p-24 shadow-[-50px_0_100px_rgba(0,0,0,1)] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-24">
                <div className="space-y-2">
                  <h2 className="text-6xl font-serif italic tracking-tighter">Configuration</h2>
                  <div className="text-[11px] uppercase tracking-[0.4em] font-black text-white/20">Terminal Parameter Sync</div>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-6 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-700 group">
                  <X size={28} className="text-white/30 group-hover:text-white transition-colors" />
                </button>
              </div>

              <div className="space-y-16">
                <div className="relative group">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-all duration-700" size={24} />
                  <input 
                    type="text" 
                    placeholder="Input Asset Identity (e.g. bitcoin)..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] py-8 pl-20 pr-10 text-xl focus:outline-none focus:border-white/50 focus:bg-white/[0.05] transition-all duration-700 placeholder:text-white/10 font-mono tracking-tight"
                  />
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div className="text-[11px] uppercase tracking-[0.4em] font-black text-white/20">Synchronized Streams</div>
                    <button 
                      onClick={() => setWatchlist([])}
                      className="text-[11px] uppercase tracking-widest font-black text-danger/50 hover:text-danger transition-all duration-700"
                    >
                      Clear All Parameters
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {watchlist.length === 0 ? (
                      <div className="p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center space-y-4">
                        <div className="text-[11px] uppercase tracking-[0.4em] font-black text-white/10">Default High-Cap Matrix Active</div>
                        <p className="text-white/5 text-xs">Top 250 Assets by Market Domination</p>
                      </div>
                    ) : (
                      watchlist.map(id => (
                        <div key={id} className="flex justify-between items-center p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-700 group">
                          <span className="text-lg font-mono uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-all duration-700">{id}</span>
                          <button onClick={() => toggleAsset(id)} className="p-3 text-white/10 hover:text-danger hover:bg-danger/5 rounded-full transition-all duration-700">
                            <X size={20} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {search && (
                  <div className="pt-12 space-y-6">
                    <div className="text-[11px] uppercase tracking-[0.4em] font-black text-white/20">Interface Discovery</div>
                    <button 
                      onClick={() => {
                        toggleAsset(search.toLowerCase())
                        setSearch('')
                      }}
                      className="w-full flex items-center justify-between p-10 bg-white text-black rounded-[2.5rem] hover:scale-[1.03] transition-all duration-700 shadow-[0_40px_80px_rgba(255,255,255,0.15)] group"
                    >
                      <div className="text-left space-y-1">
                        <div className="text-[11px] uppercase tracking-[0.3em] font-black opacity-40">Inject Parameter</div>
                        <div className="text-2xl font-mono uppercase tracking-tighter font-black">{search}</div>
                      </div>
                      <Plus size={32} className="group-hover:rotate-90 transition-transform duration-700" />
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
