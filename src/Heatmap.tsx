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

const TooltipPortal = ({ asset, mouseX, mouseY, currency, currencySymbol }: { asset: CryptoAsset, mouseX: any, mouseY: any, currency: string, currencySymbol: string }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight });
    }
  }, [asset]);

  const x = useSpring(mouseX, { stiffness: 2000, damping: 100 });
  const y = useSpring(mouseY, { stiffness: 2000, damping: 100 });

  const isRightHalf = mouseX.get() > window.innerWidth / 2;
  const isBottomHalf = mouseY.get() > window.innerHeight / 2;

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 10000,
        x: isRightHalf ? -size.width - 30 : 30,
        y: isBottomHalf ? -size.height - 30 : 30,
      }}
      className="p-8 bg-zinc-950/98 border border-white/10 backdrop-blur-[60px] rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,1)] min-w-[360px] space-y-6"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/5 p-3 flex items-center justify-center border border-white/10">
              <img src={asset.image} className="w-full h-full rounded-full" alt="" />
            </div>
            <span className="text-4xl font-serif italic tracking-tighter leading-none">{asset.name}</span>
          </div>
          <div className="text-[12px] uppercase tracking-[0.6em] font-black text-white/20 pl-1">{asset.symbol} / {currency.toUpperCase()}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-widest font-black text-white/10">Market Rank</span>
          <span className="text-3xl font-mono text-white/90">#{asset.rank}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Current Val', value: `${currencySymbol}${asset.price.toLocaleString()}` },
          { label: 'Market Cap', value: `${currencySymbol}${(asset.marketCap / 1e9).toFixed(2)}B` },
          { label: '1H Momentum', value: `${asset.change1h.toFixed(2)}%`, pos: asset.change1h >= 0 },
          { label: '24H Momentum', value: `${asset.change24h.toFixed(2)}%`, pos: asset.change24h >= 0 },
          { label: '7D Performance', value: `${asset.change7d.toFixed(2)}%`, pos: asset.change7d >= 0 },
          { label: '30D Performance', value: `${asset.change30d.toFixed(2)}%`, pos: asset.change30d >= 0 },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.4em] font-black text-white/10">{stat.label}</div>
            <div className={cn("font-mono text-lg tracking-tighter", stat.pos !== undefined ? (stat.pos ? "text-success" : "text-danger") : "text-white/80")}>
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
          if (d.rank <= 15) return 'Dominant Assets';
          if (d.rank <= 60) return 'Institutional Cap';
          return 'Emerging Markets';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      .sum((d: any) => Math.max(d.marketCap || 0, 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapSquarify.ratio(1)) // FORCE SQUARES: Prevents unreadable thin columns
      .paddingInner(1)
      .paddingOuter(6)
      .paddingTop(40)
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
        "relative overflow-hidden bg-[#080808] border border-white/5 backdrop-blur-[100px] transition-all duration-1000 shadow-[0_50px_100px_rgba(0,0,0,0.5)]",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[80vh] rounded-[4rem]"
      )}
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
    >
      {/* Category Labels */}
      {groups.map((group: any) => (
        <div 
          key={group.data.name}
          className="absolute z-20 pointer-events-none text-[12px] uppercase tracking-[0.6em] font-black text-white/10 pl-8 pt-4"
          style={{ left: group.x0, top: group.y0, width: group.x1 - group.x0 }}
        >
          {group.data.name}
        </div>
      ))}

      {/* Control Surface */}
      <div className="absolute top-12 right-12 z-30">
        <button 
          onClick={toggleFullscreen}
          className="p-6 rounded-full bg-white text-black hover:scale-110 active:scale-90 transition-all duration-700 shadow-[0_30px_60px_rgba(255,255,255,0.2)]"
        >
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
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
          const symbolSize = Math.min(Math.max(baseSize / 2.8, 11), 64);
          const showDetails = width > 100 && height > 80;
          const showSymbol = width > 28 && height > 22;

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
              transition={{ type: "spring", stiffness: 800, damping: 60, mass: 0.5 }}
              className={cn(
                "absolute overflow-hidden p-4 border group/asset cursor-none transition-colors duration-1000",
                isPositive 
                  ? "bg-success/[0.03] border-success/10 hover:bg-success/20 hover:border-success/60" 
                  : "bg-danger/[0.03] border-danger/10 hover:bg-danger/20 hover:border-danger/60"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol ? (
                  <span 
                    className="font-serif italic font-light tracking-tighter transition-all duration-1000 group-hover/asset:scale-110 group-hover/asset:tracking-[0.1em] group-hover/asset:text-white"
                    style={{ fontSize: `${symbolSize}px`, color: isPositive ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                  >
                    {asset.symbol.toUpperCase()}
                  </span>
                ) : (
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    isPositive ? "bg-success/40" : "bg-danger/40"
                  )} />
                )}
                
                {showDetails && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 flex flex-col items-center gap-3"
                  >
                    <div className="font-mono text-[13px] text-white/30 tracking-tight">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[12px] font-black px-5 py-2 rounded-full border shadow-2xl transition-all duration-700 group-hover/asset:bg-white group-hover/asset:text-black",
                      isPositive ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
                    )}>
                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/asset:opacity-100 transition-opacity pointer-events-none" />
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
