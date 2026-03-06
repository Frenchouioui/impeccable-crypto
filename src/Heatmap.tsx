import React, { useMemo, useState, useEffect } from 'react';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion, AnimatePresence } from 'framer-motion';
import type { CryptoAsset, Currency, Timeframe } from './types';
import { Maximize2, Minimize2 } from 'lucide-react';
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<CryptoAsset | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
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
          if (d.rank <= 15) return 'Majors';
          if (d.rank <= 60) return 'Mid-Cap';
          return 'Emerging';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      .sum((d: any) => Math.max(d.marketCap || 0, 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapBinary) // Creates more "square" boxes, prevents thin columns
      .paddingInner(1)
      .paddingOuter(2)
      .paddingTop(28)
      .round(true);

    treemap(hierarchy);
    return { 
      leaves: hierarchy.leaves(),
      groups: hierarchy.children || []
    };
  }, [data, dimensions]);

  const getChange = (asset: CryptoAsset) => {
    if (timeframe === '1h') return asset.change1h;
    if (timeframe === '7d') return asset.change7d;
    if (timeframe === '30d') return asset.change30d;
    return asset.change24h;
  };

  const currencySymbol = currency === 'usd' ? '$' : '€';

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative overflow-hidden bg-black/60 border border-white/5 backdrop-blur-[60px] transition-all duration-700 shadow-2xl",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[78vh] rounded-[3rem]"
      )}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      {/* Mesh Gradients */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-white/[0.02] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-white/[0.01] blur-[150px] rounded-full" />
      </div>

      {/* Category Labels */}
      {groups.map((group: any) => (
        <div 
          key={group.data.name}
          className="absolute z-10 pointer-events-none text-[10px] uppercase tracking-[0.4em] font-black text-white/10 pl-4 pt-2 mix-blend-difference"
          style={{ left: group.x0, top: group.y0, width: group.x1 - group.x0 }}
        >
          {group.data.name}
        </div>
      ))}

      {/* Fullscreen Toggle */}
      <div className="absolute top-8 right-8 z-30">
        <button 
          onClick={toggleFullscreen}
          className="p-4 rounded-full bg-white text-black hover:scale-110 transition-all duration-500 shadow-2xl"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {leaves.map((leaf: any) => {
          const asset = leaf.data as CryptoAsset;
          const width = leaf.x1 - leaf.x0;
          const height = leaf.y1 - leaf.y0;
          const change = getChange(asset);
          const isPositive = change >= 0;
          
          if (width <= 4 || height <= 4) return null;

          const baseSize = Math.min(width, height);
          const symbolSize = Math.min(Math.max(baseSize / 3, 9), 48);
          const showDetails = width > 80 && height > 60;
          const showSymbol = width > 18 && height > 15;

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
              transition={{ type: "spring", stiffness: 500, damping: 45, mass: 0.8 }}
              className={cn(
                "absolute overflow-hidden p-2 border group cursor-crosshair transition-colors duration-1000",
                isPositive 
                  ? "bg-success/5 border-success/10 hover:bg-success/25 hover:border-success/60" 
                  : "bg-danger/5 border-danger/10 hover:bg-danger/25 hover:border-danger/60"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol && (
                  <span 
                    className="font-serif italic font-light tracking-tighter transition-all duration-700 group-hover:scale-110 group-hover:tracking-wider"
                    style={{ fontSize: `${symbolSize}px` }}
                  >
                    {asset.symbol.toUpperCase()}
                  </span>
                )}
                
                {showDetails && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex flex-col items-center gap-1.5"
                  >
                    <div className="font-mono text-[11px] text-white/40 tracking-tighter">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full border shadow-sm",
                      isPositive ? "bg-success text-black border-transparent" : "bg-danger text-black border-transparent"
                    )}>
                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* FIXED TOOLTIP ENGINE: Adaptive Positioning */}
      <AnimatePresence>
        {hoveredAsset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed pointer-events-none z-[1000] p-8 bg-zinc-950/95 border border-white/10 backdrop-blur-[40px] rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] min-w-[320px] space-y-6"
            style={{ 
              left: mousePos.x + 25, 
              top: mousePos.y + 25,
              // ADVANCED COLLISION: If mouse is in right half of screen, shift tooltip to the left
              transform: `translateX(${mousePos.x > window.innerWidth / 2 ? '-110%' : '0%'}) translateY(${mousePos.y > window.innerHeight / 2 ? '-110%' : '0%'})`
            }}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 p-2 flex items-center justify-center border border-white/10">
                    <img src={hoveredAsset.image} className="w-full h-full rounded-full" alt="" />
                  </div>
                  <span className="text-3xl font-serif italic tracking-tighter">{hoveredAsset.name}</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.4em] font-black text-white/30">{hoveredAsset.symbol} / {currency.toUpperCase()}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] uppercase tracking-widest font-black text-white/20">Market Rank</span>
                <span className="text-xl font-mono text-white/90">#{hoveredAsset.rank}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Current Price', value: `${currencySymbol}${hoveredAsset.price.toLocaleString()}` },
                { label: 'Market Cap', value: `${currencySymbol}${(hoveredAsset.marketCap / 1e9).toFixed(2)}B` },
                { label: '1H Change', value: `${hoveredAsset.change1h.toFixed(2)}%`, color: hoveredAsset.change1h >= 0 ? 'text-success' : 'text-danger' },
                { label: '24H Change', value: `${hoveredAsset.change24h.toFixed(2)}%`, color: hoveredAsset.change24h >= 0 ? 'text-success' : 'text-danger' },
                { label: '7D Change', value: `${hoveredAsset.change7d.toFixed(2)}%`, color: hoveredAsset.change7d >= 0 ? 'text-success' : 'text-danger' },
                { label: '30D Change', value: `${hoveredAsset.change30d.toFixed(2)}%`, color: hoveredAsset.change30d >= 0 ? 'text-success' : 'text-danger' },
              ].map((stat, i) => (
                <div key={i} className="space-y-1 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                  <div className="text-[9px] uppercase tracking-[0.2em] font-black text-white/20">{stat.label}</div>
                  <div className={cn("font-mono text-sm", stat.color || "text-white/80")}>{stat.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
