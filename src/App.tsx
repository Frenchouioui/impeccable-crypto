import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Heatmap } from './Heatmap'
import type { CryptoAsset, Currency } from './types'
import { INITIAL_WATCHLIST } from './types'
import { Search, Plus, X, Globe, DollarSign, Euro, Settings2, Loader2 } from 'lucide-react'
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
      // We fetch top 100 + custom watchlist to ensure accuracy
      const ids = watchlist.join(',')
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets`, {
          params: {
            vs_currency: currency,
            ids: ids,
            order: 'market_cap_desc',
            per_page: 250,
            sparkline: false,
            price_change_percentage: '24h'
          }
        }
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
    refetchInterval: 30000, // Refresh every 30s
  })

  const toggleAsset = (id: string) => {
    setWatchlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-white selection:text-black">
      <div className="max-w-[1800px] mx-auto p-6 md:p-12 space-y-12">
        {/* Navigation */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] font-bold text-accent/40">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live Terminal
            </div>
            <h1 className="text-5xl md:text-7xl font-serif italic font-light tracking-tighter">
              Impeccable <span className="not-italic font-normal">Heat</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-xl">
            <button 
              onClick={() => setCurrency('usd')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${currency === 'usd' ? 'bg-white text-black' : 'hover:bg-white/10'}`}
            >
              <DollarSign size={12} /> USD
            </button>
            <button 
              onClick={() => setCurrency('eur')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${currency === 'eur' ? 'bg-white text-black' : 'hover:bg-white/10'}`}
            >
              <Euro size={12} /> EUR
            </button>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex justify-between items-center border-b border-white/5 pb-6">
          <div className="flex gap-8 items-center">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent/60">
              Monitoring {watchlist.length} Assets
            </div>
          </div>
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-2 px-8 py-3 rounded-full border border-white/10 hover:border-white/30 transition-all text-[10px] uppercase tracking-widest font-bold"
          >
            <Settings2 size={14} /> Configure Grid
          </button>
        </div>

        {/* Main Interface */}
        <main className="relative">
          {isLoading ? (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-3xl border border-white/5">
              <Loader2 className="animate-spin text-accent/20" size={48} />
              <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-accent/40">Calibrating Market</span>
            </div>
          ) : isError ? (
            <div className="h-[70vh] flex items-center justify-center text-danger/60 uppercase tracking-widest font-bold text-xs">
              Connection lost to data providers
            </div>
          ) : (
            <Heatmap data={assets || []} currency={currency} />
          )}
        </main>

        <footer className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-white/5 opacity-20 text-[10px] uppercase tracking-[0.4em] font-bold">
          <div className="flex gap-12">
            <span>Data by CoinGecko</span>
            <span>Est. 2024</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terminal Access</a>
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
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-950 border-l border-white/10 z-50 p-8 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-2xl font-serif italic tracking-tight">Configure Assets</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search market ids (e.g. cardano, ripple)..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-accent/40">Active Watchlist</div>
                  <div className="grid grid-cols-1 gap-2">
                    {watchlist.map(id => (
                      <div key={id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-xl group">
                        <span className="text-xs font-mono uppercase tracking-wider">{id}</span>
                        <button onClick={() => toggleAsset(id)} className="text-danger/40 hover:text-danger transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {search && (
                  <div className="pt-4 space-y-4">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-accent/40">Results</div>
                    <button 
                      onClick={() => {
                        toggleAsset(search.toLowerCase())
                        setSearch('')
                      }}
                      className="w-full flex items-center justify-between p-4 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all group"
                    >
                      <span className="text-xs font-mono uppercase">Add "{search}"</span>
                      <Plus size={14} />
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
