import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronRight, Brain, Clock } from 'lucide-react';

interface ThinkingBlockProps {
  content: string;
  isComplete: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isComplete }) => {
  const [isOpen, setIsOpen] = useState<boolean>(!isComplete);

  // Clean tag markers if present
  const cleanContent = content
    .replace(/^<thought>\n?|^<thinking>\n?|^\*Thinking\*\n?/i, '')
    .replace(/<\/thought>$|<\/thinking>$/i, '')
    .trim();

  return (
    <div className="my-3 rounded-2xl border border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-200">
      {/* Header Bar */}
      <motion.button
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs select-none cursor-pointer transition-colors text-left"
      >
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center">
            <Brain size={15} className="text-zinc-300" />
            {!isComplete && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white tracking-wide">
              {!isComplete ? 'Thinking...' : 'Thought Process'}
            </span>
            {!isComplete && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-zinc-300 animate-pulse border border-white/[0.08]">
                Reasoning live
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-zinc-400">
          <span className="text-[11px] font-mono text-zinc-500">
            {cleanContent.split(/\s+/).filter(Boolean).length} words
          </span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </motion.button>

      {/* Expandable Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-white/[0.06] bg-black/40 px-4 py-3 text-xs text-zinc-400 font-mono leading-relaxed overflow-hidden"
          >
            <div className="whitespace-pre-wrap pl-3 border-l-2 border-zinc-700/60">
              {cleanContent || 'Analyzing context and formulating response...'}
              {!isComplete && <span className="streaming-cursor" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
