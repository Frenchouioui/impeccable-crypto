import React, { useMemo } from 'react';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion, AnimatePresence } from 'framer-motion';
import type { CryptoAsset, Currency } from './types';
import { TrendingUp, TrendingDown } from 'lucide-react';
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
  }, []);

  const treemapData = useMemo(() => {
    if (dimensions.width === 0 || data.length === 0) return [];

    const rootData = {
      name: 'market',
      children: Array.from(
        d3Array.group(data, (d: CryptoAsset) => {
          if (d.rank <= 10) return 'Top 10';
          if (d.rank <= 50) return 'Top 50';
          return 'Altcoins';
        }), 
        ([key, value]) => ({ name: key, children: value })
      ),
    };

    const hierarchy = d3Hierarchy.hierarchy(rootData)
      .sum((d: any) => Math.max(d.marketCap || 0, 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .paddingInner(2)
      .paddingOuter(2)
      .paddingTop(20)
      .round(true);

    treemap(hierarchy);
    return hierarchy.leaves();
  }, [data, dimensions]);

  const currencySymbol = currency === 'usd' ? '$' : '€';

  return (
    <div ref={containerRef} className="w-full h-[70vh] relative overflow-hidden bg-black/20 rounded-xl border border-white/5 backdrop-blur-md">
      <AnimatePresence mode="popLayout">
        {treemapData.map((leaf: any) => {
          const asset = leaf.data as CryptoAsset;
          const width = leaf.x1 - leaf.x0;
          const height = leaf.y1 - leaf.y0;
          const isPositive = asset.change24h >= 0;
          
          // Hide labels if box is too small to prevent "cropped" look
          const showFullLabel = width > 80 && height > 60;
          const showSymbolOnly = width > 40 && height > 30;

          if (width <= 5 || height <= 5) return null;

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
              transition={{ type: "spring", stiffness: 300, damping: 35, mass: 0.5 }}
              className={cn(
                "absolute overflow-hidden p-2 border group cursor-pointer transition-colors duration-700 select-none",
                isPositive 
                  ? "bg-success/10 border-success/20 hover:bg-success/20 hover:border-success/40" 
                  : "bg-danger/10 border-danger/20 hover:bg-danger/20 hover:border-danger/40"
              )}
            >
              <div className="flex flex-col h-full items-center justify-center text-center gap-1">
                {showSymbolOnly && (
                  <div className="flex flex-col items-center">
                    <span className={cn(
                      "font-serif leading-none tracking-tight",
                      width > 150 ? "text-4xl" : width > 100 ? "text-2xl" : "text-sm"
                    )}>
                      {asset.symbol.toUpperCase()}
                    </span>
                    {showFullLabel && (
                      <span className="text-[10px] opacity-40 uppercase tracking-widest font-bold mt-1">
                        {asset.name}
                      </span>
                    )}
                  </div>
                )}
                
                {showFullLabel && (
                  <div className="mt-1 flex flex-col items-center">
                    <div className="font-mono text-xs opacity-80">
                      {currencySymbol}{asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.price < 1 ? 4 : 2,
                        maximumFractionDigits: asset.price < 1 ? 6 : 2 
                      })}
                    </div>
                    <div className={cn(
                      "text-[10px] font-bold flex items-center gap-0.5",
                      isPositive ? "text-success" : "text-danger"
                    )}>
                      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(asset.change24h).toFixed(2)}%
                    </div>
                  </div>
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
