/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import { useState } from 'react';

interface InventoryProps {
  items: Item[];
  artifactSlots?: number;
  onItemClick?: (item: Item) => void;
  onHistoryClick?: () => void;
}

interface TooltipItemProps {
  item: Item | undefined;
  idx: number;
  onClick?: () => void;
  key?: number | string | null;
}

function TooltipItem({ item, idx, onClick }: TooltipItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      initial={item ? { scale: 0.5, opacity: 0, y: 20 } : false}
      animate={item ? { 
        scale: 1, 
        opacity: 1, 
        y: 0,
        boxShadow: isHovered 
          ? "0 0 25px rgba(180, 83, 9, 0.4)" 
          : [
            "0 0 0px rgba(180, 83, 9, 0)",
            "0 0 20px rgba(180, 83, 9, 0.6)",
            "0 0 5px rgba(180, 83, 9, 0.3)"
          ]
      } : false}
      transition={item ? { 
        type: "spring", 
        stiffness: 300, 
        damping: 15,
        boxShadow: { duration: 1, times: [0, 0.5, 1] } 
      } : {}}
      className={`w-10 h-10 md:w-11 md:h-11 shrink-0 bg-soph-stone border transition-all relative ${
        item 
          ? 'border-amber-900/50 border-b-2 border-b-amber-600 hover:border-amber-400 cursor-help importance-shimmer' 
          : 'border-stone-800 opacity-40'
      }`}
    >
      {item ? (
        <div className="relative w-full h-full flex items-center justify-center p-1 md:p-2">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(180,83,9,0.3)]" />
          
          {/* Tooltip */}
          <AnimatePresence>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9, x: "-50%" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute bottom-full left-1/2 mb-4 w-[85vw] sm:w-64 pointer-events-none z-50 translate-x-[-50%]"
              >
                <div className="stone-texture p-3 sm:p-4 rounded border border-amber-700 text-stone-200 text-[10px] sm:text-xs shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative">
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-[0.5px] -z-10 rounded" />
                  <p className="font-bold text-amber-500 text-sm mb-2 uppercase tracking-[0.2em] font-display border-b border-amber-900/50 pb-1">{item.name}</p>
                  <p className="italic opacity-90 font-serif leading-relaxed">{item.description}</p>
                </div>
                {/* Arrow */}
                <div className="w-3 h-3 bg-stone-900 rotate-45 mx-auto -mt-1.5 border-r border-b border-amber-700 shadow-xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-[10px] md:text-xl opacity-[0.03] font-bold font-display select-none">SKH</div>
        </div>
      )}
    </motion.div>
  );
}

export default function Inventory({ items, artifactSlots = 3, onItemClick, onHistoryClick }: InventoryProps) {
  return (
    <div className="w-full py-2 md:py-4 flex flex-col gap-2 z-10">
      <div className="text-amber-600 text-[8px] md:text-[9px] font-display uppercase font-bold flex items-center justify-between tracking-[0.2em] w-full">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-amber-600 rounded-full" /> Hành Trang
        </div>
        <div className="text-amber-500/60 font-mono italic">
          BẢO VẬT: {items.length}/{artifactSlots}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {Array.from({ length: Math.max(10, artifactSlots) }).map((_, idx) => {
          const item = items[idx];
          return (
            <TooltipItem 
              key={idx}
              item={item} 
              idx={idx} 
              onClick={() => item && onItemClick?.(item)}
            />
          );
        })}
      </div>
    </div>
  );
}
