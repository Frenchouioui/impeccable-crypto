import React, { useMemo, useState } from 'react';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion, AnimatePresence } from 'framer-motion';
import type { CryptoAsset, Currency } from './types';
import { TrendingUp, TrendingDown, Maximize2, Minimize2 } from 'lucide-react';
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

  const treemapData = useMemo(() => {
    if (dimensions.width === 0 || data.length === 0) return [];

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
      .paddingTop(14)
      .round(true);

    treemap(hierarchy);
    return hierarchy.leaves();
  }, [data, dimensions]);

  const currencySymbol = currency === 'usd' ? '$' : '€';

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative overflow-hidden bg-black/40 border border-white/5 backdrop-blur-3xl transition-all duration-700",
        isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen rounded-none" : "w-full h-[75vh] rounded-[2.5rem]"
      )}
    >
      {/* Mesh Gradient Background for Luxury Feel */}
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-success/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-danger/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="absolute top-6 right-6 z-10">
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

      <AnimatePresence mode="popLayout">
        {treemapData.map((leaf: any) => {
          const asset = leaf.data as CryptoAsset;
          const width = leaf.x1 - leaf.x0;
          const height = leaf.y1 - leaf.y0;
          const isPositive = asset.change24h >= 0;
          
          if (width <= 4 || height <= 4) return null;

          // Dynamic font sizing
          const baseSize = Math.min(width, height);
          const symbolSize = Math.min(Math.max(baseSize / 4, 10), 42);
          const showDetails = width > 100 && height > 80;
          const showSymbol = width > 30 && height > 20;

          return (
            <motion.div
              key={asset.id}
              layoutId={asset.id}
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
                  ? "bg-success/5 border-success/10 hover:bg-success/15 hover:border-success/40" 
                  : "bg-danger/5 border-danger/10 hover:bg-danger/15 hover:border-danger/40"
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
                    <div className="font-mono text-[11px] text-white/50 tracking-tighter">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full",
                      isPositive ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    )}>
                      {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
