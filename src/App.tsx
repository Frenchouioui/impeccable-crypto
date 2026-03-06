import { useState, useEffect } from 'react'
import { Heatmap } from './Heatmap'
import { MOCK_DATA } from './types'
import type { CryptoAsset } from './types'
import { Search, Filter, Bell } from 'lucide-react'

function App() {
  const [data, setData] = useState<CryptoAsset[]>(MOCK_DATA)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(asset => ({
        ...asset,
        price: asset.price * (1 + (Math.random() - 0.5) * 0.002),
        change24h: +(asset.change24h + (Math.random() - 0.5) * 0.1).toFixed(2)
      })))
      setLastUpdate(new Date())
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-[1600px] mx-auto space-y-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent/60 uppercase tracking-[0.3em] text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Market Live
          </div>
          <h1 className="text-4xl md:text-6xl font-serif italic font-light tracking-tight">
            Impeccable <span className="font-normal not-italic">Crypto</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-[10px] uppercase tracking-widest text-accent/40 font-bold">Last Sync</span>
            <span className="text-xs font-mono text-accent/80">{lastUpdate.toLocaleTimeString()}</span>
          </div>
          <div className="flex gap-2">
            <button className="p-3 rounded-full bg-muted/30 border border-muted hover:border-accent/40 transition-colors group">
              <Search className="w-4 h-4 text-accent group-hover:text-foreground" />
            </button>
            <button className="p-3 rounded-full bg-muted/30 border border-muted hover:border-accent/40 transition-colors group">
              <Filter className="w-4 h-4 text-accent group-hover:text-foreground" />
            </button>
            <button className="px-6 py-3 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-widest hover:bg-accent transition-colors flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Watchlist
            </button>
          </div>
        </div>
      </header>

      {/* Quick Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-muted/50">
        {[
          { label: 'Market Cap', value: '$2.56T', change: '+1.2%' },
          { label: '24h Volume', value: '$84.2B', change: '-4.5%' },
          { label: 'BTC Dominance', value: '52.1%', change: '+0.2%' },
          { label: 'Fear & Greed', value: '74', change: 'Greed' },
        ].map((stat, i) => (
          <div key={i} className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-accent/40 font-bold">{stat.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-medium">{stat.value}</span>
              <span className={`text-[10px] font-bold ${stat.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Heatmap */}
      <main className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-accent/60">Global Heatmap</h2>
          <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest">
            <button className="text-foreground border-b border-foreground pb-1">24 Hours</button>
            <button className="text-accent/40 hover:text-accent transition-colors pb-1">7 Days</button>
            <button className="text-accent/40 hover:text-accent transition-colors pb-1">1 Month</button>
          </div>
        </div>
        <Heatmap data={data} />
      </main>

      <footer className="pt-8 flex justify-between items-center text-[10px] uppercase tracking-[0.3em] font-bold text-accent/20">
        <span>© 2024 IMPECCABLE STYLE</span>
        <div className="flex gap-8">
          <a href="#" className="hover:text-accent transition-colors">Twitter</a>
          <a href="#" className="hover:text-accent transition-colors">API Documentation</a>
          <a href="#" className="hover:text-accent transition-colors">Privacy</a>
        </div>
      </footer>
    </div>
  )
}

export default App
