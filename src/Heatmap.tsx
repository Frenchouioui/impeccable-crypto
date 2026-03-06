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

// Custom Tooltip Component rendered via Portal
const TooltipPortal = ({ asset, mouseX, mouseY, currency, currencySymbol }: { asset: CryptoAsset, mouseX: any, mouseY: any, currency: string, currencySymbol: string }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight });
    }
  }, [asset]);

  // Adaptive positioning logic
  const x = useSpring(mouseX, { stiffness: 1000, damping: 100 });
  const y = useSpring(mouseY, { stiffness: 1000, damping: 100 });

  const isRightHalf = mouseX.get() > window.innerWidth / 2;
  const isBottomHalf = mouseY.get() > window.innerHeight / 2;

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 9999,
        x: isRightHalf ? -size.width - 20 : 20,
        y: isBottomHalf ? -size.height - 20 : 20,
      }}
      className="p-8 bg-zinc-950/95 border border-white/10 backdrop-blur-[50px] rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] min-w-[340px] space-y-6"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 p-2.5 flex items-center justify-center border border-white/10">
              <img src={asset.image} className="w-full h-full rounded-full" alt="" />
            </div>
            <span className="text-4xl font-serif italic tracking-tighter">{asset.name}</span>
          </div>
          <div className="text-[12px] uppercase tracking-[0.5em] font-black text-white/30">{asset.symbol} / {currency.toUpperCase()}</div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest font-black text-white/20">Rank</span>
          <span className="text-2xl font-mono text-white/90">#{asset.rank}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Current Price', value: `${currencySymbol}${asset.price.toLocaleString()}` },
          { label: 'Market Cap', value: `${currencySymbol}${(asset.marketCap / 1e9).toFixed(2)}B` },
          { label: '1H', value: `${asset.change1h.toFixed(2)}%`, pos: asset.change1h >= 0 },
          { label: '24H', value: `${asset.change24h.toFixed(2)}%`, pos: asset.change24h >= 0 },
          { label: '7D', value: `${asset.change7d.toFixed(2)}%`, pos: asset.change7d >= 0 },
          { label: '30D', value: `${asset.change30d.toFixed(2)}%`, pos: asset.change30d >= 0 },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 space-y-1">
            <div className="text-[9px] uppercase tracking-[0.3em] font-black text-white/20">{stat.label}</div>
            <div className={cn("font-mono text-sm", stat.pos !== undefined ? (stat.pos ? "text-success" : "text-danger") : "text-white/80")}>
              {stat.pos !== undefined && (stat.pos ? '+' : '')}{stat.value}
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
      .tile(d3Hierarchy.treemapSquarify) // OPTIMUM: Forces squarer boxes, eliminates thin columns
      .paddingInner(1)
      .paddingOuter(4)
      .paddingTop(32)
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
        "relative overflow-hidden bg-black/60 border border-white/5 backdrop-blur-[80px] transition-all duration-700 shadow-2xl group/terminal",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[78vh] rounded-[3.5rem]"
      )}
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
    >
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/[0.01] to-transparent" />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-success/5 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-danger/5 blur-[180px] rounded-full animate-pulse" />
      </div>

      {/* Category Labels (Improved Contrast) */}
      {groups.map((group: any) => (
        <div 
          key={group.data.name}
          className="absolute z-20 pointer-events-none text-[11px] uppercase tracking-[0.5em] font-black text-white/20 pl-6 pt-3"
          style={{ left: group.x0, top: group.y0, width: group.x1 - group.x0 }}
        >
          {group.data.name}
        </div>
      ))}

      {/* Control Surface */}
      <div className="absolute top-10 right-10 z-30">
        <button 
          onClick={toggleFullscreen}
          className="p-5 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
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
          const symbolSize = Math.min(Math.max(baseSize / 3, 10), 54);
          const showDetails = width > 90 && height > 70;
          const showSymbol = width > 24 && height > 18;

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
              transition={{ type: "spring", stiffness: 600, damping: 50, mass: 0.6 }}
              className={cn(
                "absolute overflow-hidden p-3 border group/asset cursor-none transition-colors duration-1000",
                isPositive 
                  ? "bg-success/5 border-success/15 hover:bg-success/30 hover:border-success/80" 
                  : "bg-danger/5 border-danger/15 hover:bg-danger/30 hover:border-danger/80"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol ? (
                  <span 
                    className="font-serif italic font-light tracking-tighter transition-all duration-1000 group-hover/asset:scale-110 group-hover/asset:tracking-widest"
                    style={{ fontSize: `${symbolSize}px` }}
                  >
                    {asset.symbol.toUpperCase()}
                  </span>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/asset:bg-white animate-pulse" />
                )}
                
                {showDetails && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex flex-col items-center gap-2"
                  >
                    <div className="font-mono text-[12px] text-white/40 tracking-tighter">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[11px] font-black px-4 py-1.5 rounded-full border shadow-2xl transition-all duration-700 group-hover/asset:bg-white group-hover/asset:text-black",
                      isPositive ? "bg-success/20 border-success/30 text-success" : "bg-danger/20 border-danger/30 text-danger"
                    )}>
                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover/asset:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* PORTAL TOOLTIP */}
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
