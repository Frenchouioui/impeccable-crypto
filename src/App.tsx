import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Heatmap } from './Heatmap'
import type { CryptoAsset, Currency } from './types'
import { INITIAL_WATCHLIST } from './types'
import { Search, Plus, X, DollarSign, Euro, Settings2, Loader2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const queryClient = new QueryClient()

function MarketApp() {
  const [currency, setCurrency] = useState<Currency>('usd')
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('impeccable-watchlist')
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    localStorage.setItem('impeccable-watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  const { data: assets, isLoading, isError } = useQuery({
    queryKey: ['marketData', currency, watchlist],
    queryFn: async () => {
      // If watchlist is empty, we fetch top 100 to avoid "Connection Lost"
      const params: any = {
        vs_currency: currency,
        order: 'market_cap_desc',
        per_page: 250,
        sparkline: false,
        price_change_percentage: '24h'
      }

      if (watchlist.length > 0) {
        params.ids = watchlist.join(',')
      }

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets`, { params }
      )
      
      return response.data.map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap,
        rank: coin.market_cap_rank,
        image: coin.image
      })) as CryptoAsset[]
    },
    refetchInterval: 30000,
    retry: 3
  })

  const toggleAsset = (id: string) => {
    setWatchlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black antialiased">
      {/* Luxury Grain/Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50" />

      <div className="max-w-[1800px] mx-auto p-8 md:p-16 space-y-16">
        {/* Navigation - Impeccable Style: Generous Spacing & High Contrast */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.5em] font-black text-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
              Intelligence Terminal
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif italic font-extralight tracking-tighter leading-none">
              Impeccable <span className="not-italic font-medium text-white/90">Market</span>
            </h1>
          </div>

          <div className="flex flex-col items-end gap-6">
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10 backdrop-blur-3xl shadow-2xl">
              <button 
                onClick={() => setCurrency('usd')}
                className={`flex items-center gap-3 px-8 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-black transition-all duration-500 ${currency === 'usd' ? 'bg-white text-black shadow-xl scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <DollarSign size={12} /> USD
              </button>
              <button 
                onClick={() => setCurrency('eur')}
                className={`flex items-center gap-3 px-8 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-black transition-all duration-500 ${currency === 'eur' ? 'bg-white text-black shadow-xl scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Euro size={12} /> EUR
              </button>
            </div>
          </div>
        </header>

        {/* Status bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-y border-white/5 py-10">
          <div className="flex gap-16">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/20 text-center md:text-left">Network Status</div>
              <div className="text-sm font-mono tracking-tighter text-success flex items-center gap-2 justify-center md:justify-start">
                Synchronized
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/20 text-center md:text-left">Active Nodes</div>
              <div className="text-sm font-mono tracking-tighter text-center md:text-left">{watchlist.length} Assets</div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="group flex items-center gap-4 px-10 py-5 rounded-full bg-white text-black hover:bg-white/90 transition-all duration-500 text-[10px] uppercase tracking-[0.3em] font-black shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:translate-y-[-2px]"
          >
            <Settings2 size={14} /> 
            Configure Terminal
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Main Interface */}
        <main className="relative">
          {isLoading ? (
            <div className="h-[75vh] flex flex-col items-center justify-center gap-6 bg-white/[0.01] rounded-[3rem] border border-white/5">
              <Loader2 className="animate-spin text-white/10" size={64} strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-[0.8em] font-black text-white/20">Initialising Grid</span>
            </div>
          ) : isError ? (
            <div className="h-[75vh] flex items-center justify-center text-danger/40 uppercase tracking-[0.5em] font-black text-xs">
              System Interface Failure
            </div>
          ) : (
            <Heatmap data={assets || []} currency={currency} />
          )}
        </main>

        {/* Footer - Impeccable Style: Refined Typography and Real Links */}
        <footer className="pt-20 pb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 border-t border-white/5">
          <div className="space-y-4">
            <div className="text-xl font-serif italic opacity-90">Impeccable Style.</div>
            <div className="flex gap-12 text-[10px] uppercase tracking-[0.4em] font-black text-white/20">
              <span>© 2026</span>
              <span>EST. 2026</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-12 text-[10px] uppercase tracking-[0.4em] font-black text-white/40">
            <a href="https://github.com/Frenchouioui/impeccable-crypto" target="_blank" className="hover:text-white transition-colors border-b border-white/0 hover:border-white/20 pb-1">GitHub</a>
            <a href="#" className="hover:text-white transition-colors border-b border-white/0 hover:border-white/20 pb-1">Terminal API</a>
            <a href="#" className="hover:text-white transition-colors border-b border-white/0 hover:border-white/20 pb-1">Privacy Protocol</a>
            <a href="#" className="hover:text-white transition-colors border-b border-white/0 hover:border-white/20 pb-1">Institutional</a>
          </div>
        </footer>
      </div>

      {/* Asset Manager Modal */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#080808] border-l border-white/10 z-50 p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-20">
                <h2 className="text-5xl font-serif italic tracking-tighter">Terminal<br/><span className="not-italic font-normal opacity-40 text-3xl uppercase tracking-[0.2em]">Config</span></h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all group">
                  <X size={24} className="text-white/40 group-hover:text-white" />
                </button>
              </div>

              <div className="space-y-12">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by CoinGecko ID (e.g. solana)..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-6 pl-16 pr-8 text-lg focus:outline-none focus:border-white/40 focus:bg-white/[0.05] transition-all"
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20">Active Grid Selection</div>
                    <button 
                      onClick={() => setWatchlist([])}
                      className="text-[10px] uppercase tracking-widest font-black text-danger/60 hover:text-danger transition-colors"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {watchlist.length === 0 ? (
                      <div className="p-8 border border-white/5 rounded-3xl text-center text-[10px] uppercase tracking-widest text-white/10 font-black">
                        Defaulting to Top 250 Market
                      </div>
                    ) : watchlist.map(id => (
                      <div key={id} className="flex justify-between items-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all group">
                        <span className="text-sm font-mono uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{id}</span>
                        <button onClick={() => toggleAsset(id)} className="p-2 text-white/20 hover:text-danger transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {search && (
                  <div className="pt-8 space-y-4">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20">Discovery Results</div>
                    <button 
                      onClick={() => {
                        toggleAsset(search.toLowerCase())
                        setSearch('')
                      }}
                      className="w-full flex items-center justify-between p-8 bg-white text-black rounded-3xl hover:scale-[1.02] transition-all shadow-2xl"
                    >
                      <div className="text-left">
                        <div className="text-[10px] uppercase tracking-widest font-black opacity-40">Add to Terminal</div>
                        <div className="text-xl font-mono uppercase tracking-tighter font-bold">{search}</div>
                      </div>
                      <Plus size={24} />
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
