import React, { useMemo, useState } from 'react';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion, AnimatePresence } from 'framer-motion';
import type { CryptoAsset, Currency } from './types';
import { Maximize2, Minimize2, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeatmapProps {
  data: CryptoAsset[];
  currency: Currency;
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, currency }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<CryptoAsset | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      setDimensions({
        width: containerRef.current?.offsetWidth || 0,
        height: containerRef.current?.offsetHeight || 0,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const { leaves, groups } = useMemo(() => {
    if (dimensions.width === 0 || data.length === 0) return { leaves: [], groups: [] };

    const rootData = {
      name: 'market',
      children: Array.from(
        d3Array.group(data, (d: CryptoAsset) => {
          if (d.rank <= 10) return 'Majors';
          if (d.rank <= 50) return 'Mid-Cap';
          return 'Alt-Market';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      .sum((d: any) => Math.max(d.marketCap || 0, 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .paddingInner(1)
      .paddingOuter(1)
      .paddingTop(24) // Room for category headers
      .round(true);

    treemap(hierarchy);
    return { 
      leaves: hierarchy.leaves(),
      groups: hierarchy.children || []
    };
  }, [data, dimensions]);

  const currencySymbol = currency === 'usd' ? '$' : '€';

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative overflow-hidden bg-black/40 border border-white/5 backdrop-blur-3xl transition-all duration-700",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[75vh] rounded-[2.5rem]"
      )}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      {/* Category Labels (Coin360 style) */}
      {groups.map((group: any) => (
        <div 
          key={group.data.name}
          className="absolute z-10 pointer-events-none text-[9px] uppercase tracking-[0.3em] font-black text-white/20 pl-3 pt-1"
          style={{ left: group.x0, top: group.y0, width: group.x1 - group.x0 }}
        >
          {group.data.name}
        </div>
      ))}

      {/* Fullscreen Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={toggleFullscreen}
          className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all group backdrop-blur-md"
        >
          {isFullscreen ? (
            <Minimize2 size={16} className="text-white/60 group-hover:text-white" />
          ) : (
            <Maximize2 size={16} className="text-white/60 group-hover:text-white" />
          )}
        </button>
      </div>

      {/* Heatmap Leaves */}
      <AnimatePresence mode="popLayout">
        {leaves.map((leaf: any) => {
          const asset = leaf.data as CryptoAsset;
          const width = leaf.x1 - leaf.x0;
          const height = leaf.y1 - leaf.y0;
          const isPositive = asset.change24h >= 0;
          
          if (width <= 4 || height <= 4) return null;

          const baseSize = Math.min(width, height);
          const symbolSize = Math.min(Math.max(baseSize / 3, 8), 42);
          const showDetails = width > 75 && height > 55;
          const showSymbol = width > 18 && height > 14;

          return (
            <motion.div
              key={asset.id}
              layoutId={asset.id}
              onMouseEnter={() => setHoveredAsset(asset)}
              onMouseLeave={() => setHoveredAsset(null)}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                x: leaf.x0,
                y: leaf.y0,
                width,
                height,
              }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 40, mass: 1 }}
              className={cn(
                "absolute overflow-hidden p-1 border group cursor-pointer transition-colors duration-1000",
                isPositive 
                  ? "bg-success/5 border-success/10 hover:bg-success/20 hover:border-success/50" 
                  : "bg-danger/5 border-danger/10 hover:bg-danger/20 hover:border-danger/50"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol && (
                  <span 
                    className="font-serif italic font-light tracking-tighter"
                    style={{ fontSize: `${symbolSize}px` }}
                  >
                    {asset.symbol.toUpperCase()}
                  </span>
                )}
                
                {showDetails && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex flex-col items-center gap-1"
                  >
                    <div className="font-mono text-[10px] text-white/40 tracking-tighter">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full border",
                      isPositive ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
                    )}>
                      {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Highlight Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Luxury Impeccable Tooltip (anchored to mouse) */}
      <AnimatePresence>
        {hoveredAsset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed pointer-events-none z-[1000] p-6 bg-zinc-950/90 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] min-w-[240px] space-y-4"
            style={{ 
              left: mousePos.x + 20, 
              top: mousePos.y + 20,
              // Adjust position if too close to screen edges
              transform: `translateX(${mousePos.x > window.innerWidth - 300 ? '-100%' : '0'}) translateY(${mousePos.y > window.innerHeight - 300 ? '-100%' : '0'})`
            }}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <img src={hoveredAsset.image} className="w-6 h-6 rounded-full" alt="" />
                  <span className="text-xl font-serif italic tracking-tighter">{hoveredAsset.name}</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20">{hoveredAsset.symbol} / {currency.toUpperCase()}</div>
              </div>
              <div className={cn(
                "p-2 rounded-xl border flex items-center gap-1",
                hoveredAsset.change24h >= 0 ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
              )}>
                {hoveredAsset.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="text-xs font-black">{Math.abs(hoveredAsset.change24h).toFixed(2)}%</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">Current Price</span>
                <span className="font-mono text-sm">{currencySymbol}{hoveredAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">Market Cap</span>
                <span className="font-mono text-sm opacity-60">{currencySymbol}{(hoveredAsset.marketCap / 1e9).toFixed(2)}B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">Market Rank</span>
                <span className="font-mono text-sm text-accent">#{hoveredAsset.rank}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
