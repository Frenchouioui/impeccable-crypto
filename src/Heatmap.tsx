import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
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
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const width = ref.current.offsetWidth;
      const height = ref.current.offsetHeight;
      const x = mouseX.get();
      const y = mouseY.get();

      // ADVANCED BOUNDARY PROTECTION
      let finalX = x + 30;
      let finalY = y + 30;

      // Flip if hitting right edge
      if (x + width + 60 > window.innerWidth) finalX = x - width - 30;
      // Flip if hitting bottom edge
      if (y + height + 60 > window.innerHeight) finalY = y - height - 30;
      
      // Force keep on screen (Safety Buffer)
      finalX = Math.max(20, Math.min(finalX, window.innerWidth - width - 20));
      finalY = Math.max(20, Math.min(finalY, window.innerHeight - height - 20));

      setPos({ x: finalX, y: finalY });
    };
    const unsubX = mouseX.on("change", update);
    const unsubY = mouseY.on("change", update);
    update();
    return () => { unsubX(); unsubY(); };
  }, [mouseX, mouseY, asset]);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      style={{ position: 'fixed', left: pos.x, top: pos.y, pointerEvents: 'none', zIndex: 999999 }}
      className="p-10 bg-[#0a0a0a]/98 border border-white/10 backdrop-blur-3xl rounded-[3rem] shadow-[0_60px_120px_rgba(0,0,0,1)] min-w-[380px] space-y-8"
    >
      <div className="flex justify-between items-start gap-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 p-3.5 border border-white/10">
            <img src={asset.image} className="w-full h-full rounded-full" alt="" />
          </div>
          <div>
            <div className="text-4xl font-serif italic text-white tracking-tighter leading-none">{asset.name}</div>
            <div className="text-[11px] uppercase tracking-[0.6em] font-black text-white/20 mt-3">{asset.symbol} / {currency.toUpperCase()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest font-black text-white/10">Global Rank</div>
          <div className="text-3xl font-mono text-white/90 font-light">#{asset.rank}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Price', value: `${currencySymbol}${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'Market Cap', value: `${currencySymbol}${(asset.marketCap / 1e9).toFixed(2)}B` },
          { label: '1H Horizon', val: asset.change1h },
          { label: '24H Horizon', val: asset.change24h },
          { label: '7D Trajectory', val: asset.change7d },
          { label: '30D Trajectory', val: asset.change30d },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
            <div className="text-[10px] uppercase tracking-[0.4em] font-black text-white/10 mb-2">{s.label}</div>
            <div className={cn("font-mono text-lg tracking-tighter", s.val !== undefined ? (s.val >= 0 ? "text-success" : "text-danger") : "text-white/80")}>
              {s.val !== undefined ? `${s.val >= 0 ? '↑ ' : '↓ '}${Math.abs(s.val).toFixed(2)}%` : s.value}
            </div>
          </div>
        ))}
      </div>
    </motion.div>,
    document.body
  );
};

export const Heatmap: React.FC<HeatmapProps> = ({ data, currency, timeframe }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState<CryptoAsset | null>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isFullscreen]);

  const { leaves, groups } = useMemo(() => {
    if (!dimensions.width || data.length === 0) return { leaves: [], groups: [] };

    const rootData = {
      name: 'market',
      children: Array.from(
        d3Array.group(data, (d: CryptoAsset) => {
          if (d.rank <= 10) return 'Majors';
          if (d.rank <= 50) return 'Institutional';
          return 'Vectors';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      // FIX: POWER SCALING NORMALIZATION
      // Instead of raw marketcap, we use Math.pow(cap, 0.65) to prevent BTC from crushing smaller blocks
      .sum((d: any) => Math.pow(Math.max(d.marketCap || 0, 1), 0.65))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapBinary) // Binary is best for high-variance data to avoid slivers
      .paddingInner(1)
      .paddingOuter(4)
      .paddingTop(40)
      .round(true);

    treemap(hierarchy);
    return { leaves: hierarchy.leaves(), groups: hierarchy.children || [] };
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
        "relative overflow-hidden bg-[#050505] border border-white/5 backdrop-blur-[120px] transition-all duration-1000 shadow-2xl",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[82vh] rounded-[4rem]"
      )}
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}
    >
      {groups.map((g: any) => (
        <div key={g.data.name} className="absolute z-20 pointer-events-none text-[12px] uppercase tracking-[0.8em] font-black text-white/10 pl-10 pt-5"
          style={{ left: g.x0, top: g.y0, width: g.x1 - g.x0 }}>
          {g.data.name}
        </div>
      ))}

      <div className="absolute top-12 right-12 z-30">
        <button onClick={() => { 
          if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
          else document.exitFullscreen();
          setIsFullscreen(!isFullscreen);
        }} className="p-7 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all duration-700 shadow-2xl">
          {isFullscreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {leaves.map((leaf: any) => {
          const asset = leaf.data as CryptoAsset;
          const width = leaf.x1 - leaf.x0;
          const height = leaf.y1 - leaf.y0;
          const change = getChange(asset);
          const isPos = change >= 0;
          
          if (width < 2 || height < 2) return null;

          const symbolSize = Math.min(Math.max(Math.min(width, height) / 2.2, 12), 80);
          const showFull = width > 120 && height > 100;
          const showSymbol = width > 35 && height > 25;

          return (
            <motion.div
              key={asset.id}
              layoutId={asset.id}
              onMouseEnter={() => setHoveredAsset(asset)}
              onMouseLeave={() => setHoveredAsset(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: leaf.x0, y: leaf.y0, width, height }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 60 }}
              className={cn(
                "absolute overflow-hidden p-4 border group transition-colors duration-1000 cursor-none",
                isPos ? "bg-success/[0.04] border-success/15 hover:bg-success/20 hover:border-success/60" : "bg-danger/[0.04] border-danger/15 hover:bg-danger/20 hover:border-danger/60"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol ? (
                  <span className="font-serif italic font-light tracking-tighter transition-all group-hover:scale-110 group-hover:text-white"
                    style={{ fontSize: `${symbolSize}px`, color: isPos ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)' }}>
                    {asset.symbol.toUpperCase()}
                  </span>
                ) : (
                  <div className={cn("w-3 h-3 rounded-full animate-pulse blur-[1px]", isPos ? "bg-success/60 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-danger/60 shadow-[0_0_15px_rgba(239,68,68,0.5)]")} />
                )}
                
                {showFull && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex flex-col items-center gap-3">
                    <div className="font-mono text-[14px] text-white/30 tracking-tight font-medium">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className={cn("text-[12px] font-black px-6 py-2 rounded-full border shadow-2xl transition-all duration-700 group-hover:bg-white group-hover:text-black",
                      isPos ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger")}>
                      {isPos ? '+ ' : ''}{change.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {hoveredAsset && (
        <TooltipPortal asset={hoveredAsset} mouseX={mouseX} mouseY={mouseY} currency={currency} currencySymbol={currencySymbol} />
      )}
    </div>
  );
};
