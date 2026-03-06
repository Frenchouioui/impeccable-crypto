import React, { useMemo } from 'react';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Array from 'd3-array';
import { motion } from 'framer-motion';
import type { CryptoAsset } from './types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeatmapProps {
  data: CryptoAsset[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
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
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const treemapData = useMemo(() => {
    if (dimensions.width === 0) return [];

    // Group by category
    const groupedData = d3Array.group(data, (d: CryptoAsset) => d.category);
    const root = {
      name: 'market',
      children: Array.from(groupedData, ([key, value]) => ({
        name: key,
        children: value,
      })),
    };

    const hierarchy = d3Hierarchy.hierarchy(root)
      .sum((d: any) => d.marketCap)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3Hierarchy.treemap<any>()
      .size([dimensions.width, dimensions.height])
      .paddingInner(4)
      .paddingOuter(4)
      .paddingTop(24)
      .round(true);

    treemap(hierarchy);
    return hierarchy.leaves();
  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-200px)] relative overflow-hidden bg-background/50 rounded-2xl border border-muted/50 backdrop-blur-sm">
      {treemapData.map((leaf: any, i: number) => {
        const asset = leaf.data as CryptoAsset;
        const isPositive = asset.change24h >= 0;
        
        return (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: leaf.x0,
              y: leaf.y0,
              width: leaf.x1 - leaf.x0,
              height: leaf.y1 - leaf.y0,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 20,
              delay: i * 0.02 
            }}
            className={cn(
              "absolute overflow-hidden p-3 border group cursor-pointer transition-colors duration-500",
              isPositive 
                ? "bg-success-muted border-success/30 hover:border-success/60" 
                : "bg-danger-muted border-danger/30 hover:border-danger/60"
            )}
            style={{ position: 'absolute' }}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-lg leading-tight group-hover:tracking-wider transition-all duration-300">
                    {asset.symbol}
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-accent/60 font-medium">
                    {asset.name}
                  </p>
                </div>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
              </div>
              
              <div className="mt-auto">
                <div className="font-mono text-sm tracking-tighter text-foreground/90">
                  ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={cn(
                  "text-xs font-bold",
                  isPositive ? "text-success" : "text-danger"
                )}>
                  {isPositive ? '+' : ''}{asset.change24h}%
                </div>
              </div>
            </div>
            
            {/* Gloss effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
};
