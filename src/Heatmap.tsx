import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as d3Hierarchy from 'd3-hierarchy';
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

      let finalX = x + 25;
      let finalY = y + 25;

      if (x + width + 50 > window.innerWidth) finalX = x - width - 25;
      if (y + height + 50 > window.innerHeight) finalY = y - height - 25;
      
      finalX = Math.max(15, Math.min(finalX, window.innerWidth - width - 15));
      finalY = Math.max(15, Math.min(finalY, window.innerHeight - height - 15));

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{ position: 'fixed', left: pos.x, top: pos.y, pointerEvents: 'none', zIndex: 1000000 }}
      className="p-10 bg-black/95 border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_60px_120px_rgba(0,0,0,1)] min-w-[400px] space-y-8"
    >
      <div className="flex justify-between items-start gap-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 p-3.5 border border-white/10">
            <img src={asset.image} className="w-full h-full rounded-full" alt="" />
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-serif italic text-white tracking-tighter leading-none">{asset.name}</div>
            <div className="text-[11px] uppercase tracking-[0.6em] font-black text-white/20">{asset.symbol} / {currency.toUpperCase()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest font-black text-white/10">Global Rank</div>
          <div className="text-3xl font-mono text-white/90">#{asset.rank}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Current Price', value: `${currencySymbol}${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'Market Cap', value: `${currencySymbol}${(asset.marketCap / 1e9).toFixed(2)}B` },
          { label: '1H Momentum', val: asset.change1h },
          { label: '24H Momentum', val: asset.change24h },
          { label: '7D Performance', val: asset.change7d },
          { label: '30D Performance', val: asset.change30d },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 space-y-2 shadow-inner">
            <div className="text-[10px] uppercase tracking-[0.4em] font-black text-white/10">{s.label}</div>
            <div className={cn("font-mono text-xl tracking-tighter", s.val !== undefined ? (s.val >= 0 ? "text-success" : "text-danger") : "text-white/80")}>
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
    const obs = new ResizeObserver(update);
    obs.observe(containerRef.current!);
    return () => obs.disconnect();
  }, [isFullscreen]);

  const leaves = useMemo(() => {
    if (!dimensions.width || data.length === 0) return [];

    const root = d3Hierarchy.hierarchy({ name: 'root', children: data })
      .sum((d: any) => Math.pow(Math.max(d.marketCap || 0, 1), 0.65))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapSquarify.ratio(1)) // GOLDEN RATIO: Balanced squares
      .paddingInner(2)
      .paddingOuter(10)
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
    <div 
      ref={containerRef} 
      className={cn(
        "relative overflow-hidden bg-[#020202] border border-white/5 backdrop-blur-[120px] transition-all duration-1000 shadow-2xl",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[82vh] rounded-[5rem]"
      )}
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}
    >
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

          const symbolSize = Math.min(Math.max(Math.min(width, height) / 2.5, 12), 80);
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
              transition={{ type: "spring", stiffness: 800, damping: 60, mass: 0.5 }}
              className={cn(
                "absolute overflow-hidden border group transition-colors duration-1000 cursor-crosshair",
                isPos ? "bg-success/[0.04] border-success/15 hover:bg-success/20 hover:border-success/60" : "bg-danger/[0.04] border-danger/15 hover:bg-danger/20 hover:border-danger/60"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center p-2">
                {showSymbol ? (
                  <span className="font-serif italic font-light tracking-tighter transition-all group-hover:scale-110 group-hover:text-white"
                    style={{ fontSize: `${symbolSize}px`, color: isPos ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)' }}>
                    {asset.symbol.toUpperCase()}
                  </span>
                ) : (
                  <div className={cn("w-3 h-3 rounded-full animate-pulse blur-[1px]", isPos ? "bg-success/60 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-danger/60 shadow-[0_0_15px_rgba(239,68,68,0.5)]")} />
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
