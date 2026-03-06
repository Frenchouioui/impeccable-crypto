import React, { useMemo, useState, useEffect, useRef } from 'react';
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

// TOOLTIP PORTAL : ANTI-CLIPPING ENGINE
const TooltipPortal = ({ asset, mouseX, mouseY, currency, currencySymbol }: { asset: CryptoAsset, mouseX: any, mouseY: any, currency: string, currencySymbol: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const springX = useSpring(mouseX, { stiffness: 1000, damping: 100 });
  const springY = useSpring(mouseY, { stiffness: 1000, damping: 100 });

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const width = ref.current.offsetWidth;
      const height = ref.current.offsetHeight;
      const x = mouseX.get();
      const y = mouseY.get();

      // Smart flip logic
      let finalX = x + 30;
      let finalY = y + 30;

      if (x + width + 50 > window.innerWidth) finalX = x - width - 30;
      if (y + height + 50 > window.innerHeight) finalY = y - height - 30;

      setPos({ x: finalX, y: finalY });
    };
    const unsubscribeX = mouseX.on("change", update);
    const unsubscribeY = mouseY.on("change", update);
    update();
    return () => { unsubscribeX(); unsubscribeY(); };
  }, [mouseX, mouseY, asset]);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        pointerEvents: 'none',
        zIndex: 99999,
      }}
      className="p-8 bg-[#080808] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,1)] min-w-[320px] space-y-6"
    >
      <div className="flex justify-between items-start gap-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 p-2 border border-white/10">
            <img src={asset.image} className="w-full h-full rounded-full" alt="" />
          </div>
          <div>
            <div className="text-3xl font-serif italic text-white leading-none">{asset.name}</div>
            <div className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 mt-2">{asset.symbol} / {currency.toUpperCase()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest font-black text-white/10">Rank</div>
          <div className="text-xl font-mono text-white/80">#{asset.rank}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Price', value: `${currencySymbol}${asset.price.toLocaleString()}` },
          { label: 'Cap', value: `${currencySymbol}${(asset.marketCap / 1e9).toFixed(2)}B` },
          { label: '1H', val: asset.change1h },
          { label: '24H', val: asset.change24h },
          { label: '7D', val: asset.change7d },
          { label: '30D', val: asset.change30d },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <div className="text-[9px] uppercase tracking-[0.3em] font-black text-white/10 mb-1">{s.label}</div>
            <div className={cn(
              "font-mono text-sm",
              s.val !== undefined ? (s.val >= 0 ? "text-success" : "text-danger") : "text-white/80"
            )}>
              {s.val !== undefined ? `${s.val >= 0 ? '+' : ''}${s.val.toFixed(2)}%` : s.value}
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
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isFullscreen]);

  const { leaves, groups } = useMemo(() => {
    if (!dimensions.width || data.length === 0) return { leaves: [], groups: [] };

    // Grouping refined for maximum block stability
    const rootData = {
      name: 'market',
      children: Array.from(
        d3Array.group(data, (d: CryptoAsset) => {
          if (d.rank <= 10) return 'Majors';
          if (d.rank <= 50) return 'Institutional';
          return 'Growth';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      .sum((d: any) => Math.max(d.marketCap || 0, 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .tile(d3Hierarchy.treemapBinary) // THE FIX: treemapBinary is much more robust for avoiding thin columns
      .paddingInner(1)
      .paddingOuter(2)
      .paddingTop(30)
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
        "relative overflow-hidden bg-[#050505] border border-white/5 backdrop-blur-[100px] transition-all duration-1000 shadow-2xl",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[80vh] rounded-[4rem]"
      )}
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
    >
      {groups.map((g: any) => (
        <div 
          key={g.data.name}
          className="absolute z-20 pointer-events-none text-[11px] uppercase tracking-[0.6em] font-black text-white/10 pl-6 pt-3"
          style={{ left: g.x0, top: g.y0, width: g.x1 - g.x0 }}
        >
          {g.data.name}
        </div>
      ))}

      <div className="absolute top-10 right-10 z-30">
        <button 
          onClick={() => {
            if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
            else document.exitFullscreen();
            setIsFullscreen(!isFullscreen);
          }}
          className="p-6 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all duration-500 shadow-2xl"
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
          const isPos = change >= 0;
          
          if (width < 2 || height < 2) return null;

          const symbolSize = Math.min(Math.max(Math.min(width, height) / 2.5, 10), 64);
          const showFull = width > 100 && height > 80;
          const showSymbol = width > 25 && height > 20;

          return (
            <motion.div
              key={asset.id}
              layoutId={asset.id}
              onMouseEnter={() => setHoveredAsset(asset)}
              onMouseLeave={() => setHoveredAsset(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: leaf.x0, y: leaf.y0, width, height }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 50 }}
              className={cn(
                "absolute overflow-hidden p-2 border group transition-colors duration-700 cursor-crosshair",
                isPos ? "bg-success/[0.03] border-success/10 hover:bg-success/20 hover:border-success/50" : "bg-danger/[0.03] border-danger/10 hover:bg-danger/20 hover:border-danger/50"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center">
                {showSymbol ? (
                  <span 
                    className="font-serif italic font-light tracking-tighter transition-all group-hover:scale-110"
                    style={{ fontSize: `${symbolSize}px`, color: isPos ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                  >
                    {asset.symbol.toUpperCase()}
                  </span>
                ) : (
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", isPos ? "bg-success/40" : "bg-danger/40")} />
                )}
                
                {showFull && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex flex-col items-center gap-2">
                    <div className="font-mono text-[12px] text-white/30 tracking-tight">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className={cn(
                      "text-[11px] font-black px-4 py-1.5 rounded-full border shadow-xl",
                      isPos ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
                    )}>
                      {isPos ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {hoveredAsset && (
        <TooltipPortal 
          asset={hoveredAsset} 
          mouseX={mouseX} 
          mouseY={mouseY} 
          currency={currency} 
          currencySymbol={currencySymbol} 
        />
      )}
    </div>
  );
};
