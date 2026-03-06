import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
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

// QUADRANT-AWARE TOOLTIP PORTAL
const TooltipPortal = ({ asset, mouseX, mouseY, currency, currencySymbol }: { asset: CryptoAsset, mouseX: any, mouseY: any, currency: string, currencySymbol: string }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight });
    }
  }, [asset]);

  const x = useSpring(mouseX, { stiffness: 2000, damping: 120 });
  const y = useSpring(mouseY, { stiffness: 2000, damping: 120 });

  // Robust boundary detection
  const isRight = mouseX.get() > window.innerWidth - 400;
  const isBottom = mouseY.get() > window.innerHeight - 400;

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 100000,
        x: isRight ? -size.width - 40 : 40,
        y: isBottom ? -size.height - 40 : 40,
      }}
      className="p-10 bg-[#0a0a0a]/95 border border-white/10 backdrop-blur-[80px] rounded-[3rem] shadow-[0_60px_120px_rgba(0,0,0,1)] min-w-[380px] space-y-8"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-14 rounded-[1.5rem] bg-white/5 p-3.5 flex items-center justify-center border border-white/10 shadow-inner">
              <img src={asset.image} className="w-full h-full rounded-full" alt="" />
            </div>
            <span className="text-5xl font-serif italic tracking-tighter leading-none text-white/95">{asset.name}</span>
          </div>
          <div className="text-[13px] uppercase tracking-[0.8em] font-black text-white/20 pl-1">{asset.symbol} / {currency.toUpperCase()}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[11px] uppercase tracking-widest font-black text-white/10">Global Rank</span>
          <span className="text-4xl font-mono text-white/90">#{asset.rank}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {[
          { label: 'Current Valuation', value: `${currencySymbol}${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'Market Capitalization', value: `${currencySymbol}${(asset.marketCap / 1e9).toFixed(2)}B` },
          { label: '1H Horizon', value: `${asset.change1h.toFixed(2)}%`, pos: asset.change1h >= 0 },
          { label: '24H Horizon', value: `${asset.change24h.toFixed(2)}%`, pos: asset.change24h >= 0 },
          { label: '7D Trajectory', value: `${asset.change7d.toFixed(2)}%`, pos: asset.change7d >= 0 },
          { label: '30D Trajectory', value: `${asset.change30d.toFixed(2)}%`, pos: asset.change30d >= 0 },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-3 shadow-inner">
            <div className="text-[10px] uppercase tracking-[0.5em] font-black text-white/10">{stat.label}</div>
            <div className={cn("font-mono text-xl tracking-tighter font-medium", stat.pos !== undefined ? (stat.pos ? "text-success" : "text-danger") : "text-white/80")}>
              {stat.pos !== undefined && (stat.pos ? '↑ ' : '↓ ')}{stat.value}
            </div>
          </div>
        ))}
      </div>
    </motion.div>,
    document.body
  );
};

export const Heatmap: React.FC<HeatmapProps> = ({ data, currency, timeframe }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<CryptoAsset | null>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

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

    // Grouping logic refined for visual weight
    const rootData = {
      name: 'market',
      children: Array.from(
        d3Array.group(data, (d: CryptoAsset) => {
          if (d.rank <= 12) return 'Market Dominance';
          if (d.rank <= 50) return 'Institutional Layer';
          return 'Growth Vectors';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      .sum((d: any) => Math.max(d.marketCap || 0, 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapSquarify.ratio(1.2)) // AGGRESSIVE SQUARIFY: Prioritize squares to eliminate slivers
      .paddingInner(1)
      .paddingOuter(10) // More breathing room between groups
      .paddingTop(50)  // Tall headers for readability
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
        "relative overflow-hidden bg-[#050505] border border-white/5 backdrop-blur-[120px] transition-all duration-1000 shadow-[0_100px_200px_rgba(0,0,0,0.8)]",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full min-w-[1000px] h-[82vh] rounded-[5rem]"
      )}
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
    >
      {/* Category Labels (Fixed Position) */}
      {groups.map((group: any) => (
        <div 
          key={group.data.name}
          className="absolute z-20 pointer-events-none text-[13px] uppercase tracking-[1em] font-black text-white/10 pl-12 pt-6 mix-blend-plus-lighter"
          style={{ left: group.x0, top: group.y0, width: group.x1 - group.x0 }}
        >
          {group.data.name}
        </div>
      ))}

      {/* Control Surface */}
      <div className="absolute top-12 right-12 z-30">
        <button 
          onClick={toggleFullscreen}
          className="p-7 rounded-full bg-white text-black hover:scale-110 active:scale-90 transition-all duration-700 shadow-[0_40px_80px_rgba(255,255,255,0.25)] group"
        >
          {isFullscreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {leaves.map((leaf: any) => {
          const asset = leaf.data as CryptoAsset;
          const width = leaf.x1 - leaf.x0;
          const height = leaf.y1 - leaf.y0;
          const change = getChange(asset);
          const isPositive = change >= 0;
          
          if (width <= 2 || height <= 2) return null;

          const baseSize = Math.min(width, height);
          const symbolSize = Math.min(Math.max(baseSize / 2.5, 12), 72);
          const showDetails = width > 110 && height > 90;
          const showSymbol = width > 32 && height > 26;

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
              transition={{ type: "spring", stiffness: 1000, damping: 70, mass: 0.4 }}
              className={cn(
                "absolute overflow-hidden p-5 border group/asset cursor-none transition-colors duration-1000",
                isPositive 
                  ? "bg-success/[0.04] border-success/15 hover:bg-success/25 hover:border-success/80" 
                  : "bg-danger/[0.04] border-danger/15 hover:bg-danger/25 hover:border-danger/80"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol ? (
                  <span 
                    className="font-serif italic font-light tracking-tighter transition-all duration-1000 group-hover/asset:scale-110 group-hover/asset:tracking-[0.2em] group-hover/asset:text-white"
                    style={{ fontSize: `${symbolSize}px`, color: isPositive ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)' }}
                  >
                    {asset.symbol.toUpperCase()}
                  </span>
                ) : (
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse blur-[1px]",
                    isPositive ? "bg-success/60 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-danger/60 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  )} />
                )}
                
                {showDetails && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 flex flex-col items-center gap-4"
                  >
                    <div className="font-mono text-[14px] text-white/40 tracking-tight font-medium">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[13px] font-black px-6 py-2.5 rounded-full border shadow-2xl transition-all duration-700 group-hover/asset:bg-white group-hover/asset:text-black",
                      isPositive ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
                    )}>
                      {isPositive ? '+ ' : ''}{change.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/asset:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredAsset && (
          <TooltipPortal 
            asset={hoveredAsset} 
            mouseX={mouseX} 
            mouseY={mouseY} 
            currency={currency} 
            currencySymbol={currencySymbol} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
