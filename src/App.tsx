import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Heatmap } from './Heatmap'
import type { CryptoAsset, Currency, Timeframe } from './types'
import { INITIAL_WATCHLIST } from './types'
import { Loader2, DollarSign, Euro } from 'lucide-react'
import { motion } from 'framer-motion'

const queryClient = new QueryClient()

function MarketApp() {
  const [currency, setCurrency] = useState<Currency>('usd')
  const [timeframe, setTimeframe] = useState<Timeframe>('24h')
  const [watchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('impeccable-watchlist-v2')
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST
  })

  useEffect(() => {
    localStorage.setItem('impeccable-watchlist-v2', JSON.stringify(watchlist))
  }, [watchlist])

  const { data: assets, isLoading, isError } = useQuery({
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
        if (watchlist.length > 0) params.ids = watchlist.join(',')

        const response = await axios.get(`/api/market`, { params })
        
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
    refetchInterval: 60000,
  })

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-white selection:text-black antialiased overflow-hidden">
      {/* Editorial Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-[100]" />

      <div className="max-w-[2200px] mx-auto p-10 md:p-20 space-y-16 h-screen flex flex-col">
        {/* Institutional Header */}
        <header className="flex justify-between items-end">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.8em] font-black text-white/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_20px_rgba(16,185,129,1)]" />
              Nexus Terminal 5.0
            </div>
            <h1 className="text-8xl md:text-[10rem] font-serif italic font-extralight tracking-tighter leading-[0.8]">
              Impeccable <span className="not-italic font-medium text-white/90">Market</span>
            </h1>
          </div>

          <div className="flex items-center gap-10">
            {/* Currency Controls */}
            <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-full border border-white/5 backdrop-blur-3xl">
              {(['usd', 'eur'] as const).map(curr => (
                <button 
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`flex items-center gap-3 px-10 py-3.5 rounded-full text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-700 ${currency === curr ? 'bg-white text-black shadow-2xl' : 'text-white/20 hover:text-white'}`}
                >
                  {curr === 'usd' ? <DollarSign size={13} /> : <Euro size={13} />} {curr}
                </button>
              ))}
            </div>

            {/* Timeframe Controls */}
            <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-full border border-white/5 backdrop-blur-3xl">
              {(['1h', '24h', '7d', '30d'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-8 py-3.5 rounded-full text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-700 ${timeframe === t ? 'bg-white text-black shadow-2xl' : 'text-white/20 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Intelligence Grid */}
        <main className="flex-grow relative">
          {isLoading && !assets ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-10 bg-white/[0.01] rounded-[4rem] border border-white/5">
              <Loader2 className="animate-spin text-white/5" size={100} strokeWidth={0.5} />
              <div className="text-[11px] uppercase tracking-[1.5em] font-black text-white/10 animate-pulse">Syncing Global Vectors</div>
            </div>
          ) : isError && !assets ? (
            <div className="h-full w-full flex items-center justify-center text-danger/40 uppercase tracking-[1em] font-black text-xs">
              Protocol Fault
            </div>
          ) : (
            <Heatmap data={assets || []} currency={currency} timeframe={timeframe} />
          )}
        </main>

        {/* Dynamic Status Bar */}
        <footer className="flex justify-between items-center pt-10 border-t border-white/5">
          <div className="flex gap-20 text-[10px] uppercase tracking-[0.6em] font-black text-white/10">
            <div className="flex items-center gap-3">
              <span className="text-white/5">Vectors:</span> {watchlist.length || 250} ACTIVE
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/5">Status:</span> SYNCHRONIZED
            </div>
          </div>
          <div className="flex gap-16 text-[10px] uppercase tracking-[0.6em] font-black text-white/20">
            {['Terminal API', 'Privacy', 'institutional'].map(link => (
              <a key={link} href="#" className="hover:text-white transition-all border-b border-transparent hover:border-white/20 pb-1">{link}</a>
            ))}
          </div>
        </footer>
      </div>
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
