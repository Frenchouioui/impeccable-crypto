import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as d3Hierarchy from 'd3-hierarchy';
import { motion, AnimatePresence } from 'framer-motion';
import type { CryptoAsset, Currency, Timeframe } from './types';
import { Maximize2, Minimize2, Globe, Info, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeatmapProps {
  data: CryptoAsset[];
  currency: Currency;
  timeframe: Timeframe;
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, currency, timeframe }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredAsset, setHoveredAsset] = useState<CryptoAsset | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(containerRef.current!);
    return () => obs.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const leaves = useMemo(() => {
    if (!dimensions.width || data.length === 0) return [];

    const root = d3Hierarchy.hierarchy({ name: 'root', children: data })
      .sum((d: any) => Math.pow(Math.max(d.marketCap || 0, 1), 0.35))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapBinary)
      .paddingInner(2)
      .paddingOuter(2)
      .round(true);

    treemap(root);
    return root.leaves();
  }, [data, dimensions]);

  const getChange = (asset: CryptoAsset) => {
    if (timeframe === '1h') return asset.change1h;
    if (timeframe === '7d') return asset.change7d;
    if (timeframe === '30d') return asset.change30d;
    return asset.change24h;
  };

  const currencySymbol = currency === 'usd' ? '$' : '€';

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">
      {/* MAIN VISUALIZATION MATRIX */}
      <div 
        ref={containerRef} 
        className={cn(
          "relative flex-grow bg-[#050505] border border-white/5 backdrop-blur-3xl transition-all duration-1000 shadow-2xl overflow-hidden min-h-[400px]",
          isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "rounded-[3rem]"
        )}
      >
        {!isFullscreen && (
          <div className="absolute top-8 right-8 z-30 flex gap-2">
            <button 
              onClick={toggleFullscreen}
              className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white text-white hover:text-black transition-all duration-500 backdrop-blur-xl"
            >
              <Maximize2 size={20} />
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {leaves.map((leaf: any) => {
            const asset = leaf.data as CryptoAsset;
            const width = leaf.x1 - leaf.x0;
            const height = leaf.y1 - leaf.y0;
            const change = getChange(asset);
            const isPos = change >= 0;
            
            if (width < 2 || height < 2) return null;

            const symbolSize = Math.min(Math.max(Math.min(width, height) / 3.5, 12), 64);
            const showSymbol = width > 30 && height > 25;
            const showDetails = width > 100 && height > 80;

            return (
              <motion.div
                key={asset.id}
                layoutId={asset.id}
                onMouseEnter={() => setHoveredAsset(asset)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x: leaf.x0, y: leaf.y0, width, height }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 40, mass: 0.8 }}
                className={cn(
                  "absolute overflow-hidden p-4 border group transition-all duration-700 cursor-crosshair",
                  isPos ? "bg-success/[0.02] border-success/10 hover:bg-success/20 hover:border-success/60" : "bg-danger/[0.02] border-danger/10 hover:bg-danger/20 hover:border-danger/60"
                )}
              >
                <div className="flex flex-col h-full items-center justify-center text-center gap-1">
                  {showSymbol ? (
                    <>
                      <span 
                        className="font-serif italic font-light tracking-tighter transition-all duration-700 group-hover:scale-110"
                        style={{ fontSize: `${symbolSize}px`, color: isPos ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)' }}
                      >
                        {asset.symbol.toUpperCase()}
                      </span>
                      
                      {showDetails && (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-1"
                        >
                          <span className="font-mono text-[11px] text-white/30 tracking-tight">
                            {currencySymbol}{asset.price.toLocaleString(undefined, { maximumFractionDigits: asset.price < 1 ? 4 : 2 })}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full border",
                            isPos ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
                          )}>
                            {isPos ? '+' : ''}{change.toFixed(2)}%
                          </span>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", isPos ? "bg-success/40" : "bg-danger/40")} />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* SIDE DATA INSPECTOR (Luxury Panel) */}
      <aside className="w-full lg:w-[450px] h-full bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between backdrop-blur-2xl overflow-y-auto">
        <AnimatePresence mode="wait">
          {hoveredAsset ? (
            <motion.div 
              key={`${hoveredAsset.id}-${currency}`} // Key update on currency change
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 p-4 shadow-2xl">
                    <img src={hoveredAsset.image} className="w-full h-full rounded-full" alt="" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-serif italic text-white tracking-tighter">{hoveredAsset.name}</h2>
                    <p className="text-[11px] uppercase tracking-[0.6em] font-black text-white/20 mt-2">{hoveredAsset.symbol} / {currency.toUpperCase()}</p>
                  </div>
                </div>
                <div className="h-px w-full bg-white/5" />
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-white/10">Institutional Valuation</p>
                  <p className="text-6xl font-mono tracking-tighter font-light text-white/90">
                    {currencySymbol}{hoveredAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Market Cap', value: `${currencySymbol}${(hoveredAsset.marketCap / 1e9).toFixed(2)}B` },
                    { label: 'Market Rank', value: `#${hoveredAsset.rank}` },
                    { label: '1h Momentum', value: `${hoveredAsset.change1h.toFixed(2)}%`, pos: hoveredAsset.change1h >= 0 },
                    { label: '24h Momentum', value: `${hoveredAsset.change24h.toFixed(2)}%`, pos: hoveredAsset.change24h >= 0 },
                    { label: '7d Horizon', value: `${hoveredAsset.change7d.toFixed(2)}%`, pos: hoveredAsset.change7d >= 0 },
                    { label: '30d Horizon', value: `${hoveredAsset.change30d.toFixed(2)}%`, pos: hoveredAsset.change30d >= 0 },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-2">
                      <p className="text-[9px] uppercase tracking-[0.3em] font-black text-white/10">{stat.label}</p>
                      <p className={cn("font-mono text-sm tracking-tighter font-bold flex items-center gap-1.5", stat.pos !== undefined ? (stat.pos ? "text-success" : "text-danger") : "text-white/60")}>
                        {stat.pos !== undefined && (stat.pos ? <TrendingUp size={12}/> : <TrendingDown size={12}/>)}
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <button className="w-full py-5 rounded-full bg-white text-black text-[10px] uppercase tracking-[0.4em] font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-3">
                  <Globe size={14} /> Global Terminal Profile
                </button>
                <button className="w-full py-5 rounded-full border border-white/10 text-white text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white/5 transition-all flex items-center justify-center gap-3">
                  <Info size={14} /> Network Parameters
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
              <Activity size={48} strokeWidth={1} className="animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.8em] font-black">Waiting for Data Stream</p>
            </div>
          )}
        </AnimatePresence>

        <div className="pt-10 border-t border-white/5 flex justify-between items-center text-[9px] uppercase tracking-[0.4em] font-black text-white/10">
          <span>SECURED FEED</span>
          <span>© 2026 NEXUS</span>
        </div>
      </aside>
    </div>
  );
};
