import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';

export interface FontOption {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  proseFont: string;
  codeFont: string;
}

export const FONT_CANDIDATES: FontOption[] = [
  {
    key: 'A',
    label: 'Option A',
    proseFont: "'Geist', -apple-system, sans-serif",
    codeFont: "'Geist Mono', monospace",
  },
  {
    key: 'B',
    label: 'Option B',
    proseFont: "'JetBrains Mono', monospace",
    codeFont: "'JetBrains Mono', monospace",
  },
  {
    key: 'C',
    label: 'Option C',
    proseFont: "'Inter', -apple-system, sans-serif",
    codeFont: "'Fira Code', monospace",
  },
  {
    key: 'D',
    label: 'Option D',
    proseFont: "'IBM Plex Sans', sans-serif",
    codeFont: "'IBM Plex Mono', monospace",
  },
  {
    key: 'E',
    label: 'Option E',
    proseFont: "'Fira Code', monospace",
    codeFont: "'Fira Code', monospace",
  },
];

interface FontTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFontKey: string;
  onSelectFont: (font: FontOption) => void;
}

export const FontTestModal: React.FC<FontTestModalProps> = ({
  isOpen,
  onClose,
  selectedFontKey,
  onSelectFont,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0c0c0e] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-white/[0.08] bg-[#09090b]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-zinc-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Blind Typography Comparison</h2>
            </div>
            <p className="text-xs text-zinc-400">
              Compare all 5 typography suites side-by-side. Choose the one that feels most comfortable for your eyes during long sessions.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Font Cards Grid */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {FONT_CANDIDATES.map((opt) => {
              const isSelected = selectedFontKey === opt.key;
              return (
                <motion.div
                  key={opt.key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectFont(opt)}
                  className={`card-glow p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-[#18181b] border-white text-white shadow-xl ring-1 ring-white/30'
                      : 'bg-[#09090b]/90 border-white/[0.08] hover:border-white/[0.25] text-zinc-300'
                  }`}
                >
                  <div className="space-y-3" style={{ fontFamily: opt.proseFont }}>
                    <div className="flex justify-between items-center">
                      <span className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-bold tracking-wider text-white uppercase">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="flex items-center space-x-1 text-xs text-emerald-400 font-semibold">
                          <Check size={14} />
                          <span>Active Selection</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Building High-Throughput Agentic Systems
                    </h3>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      During deep focus sessions, typography dictates visual endurance. Test character disambiguation:
                      <span className="font-mono text-zinc-200 ml-1">0O · 1lI · {} · [] · !== · &gt;= · &lt;= · =&gt;</span>
                    </p>

                    {/* Code Sample */}
                    <div
                      className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06] text-xs font-mono overflow-x-auto text-zinc-300 leading-relaxed"
                      style={{ fontFamily: opt.codeFont }}
                    >
                      <div><span className="text-[#89b4fa]">async function</span> <span className="text-[#f9e2af]">orchestrateTasks</span>(nodes: <span className="text-[#a6e3a1]">string</span>[]): <span className="text-[#89b4fa]">Promise</span>&lt;<span className="text-[#a6e3a1]">void</span>&gt; &#123;</div>
                      <div className="pl-4">const pipeline = nodes.<span className="text-[#89b4fa]">map</span>((node, idx) =&gt; (&#123; id: idx, ready: <span className="text-[#cba6f7]">true</span> &#125;));</div>
                      <div className="pl-4">await <span className="text-[#89b4fa]">Promise</span>.<span className="text-[#f9e2af]">all</span>(pipeline.<span className="text-[#89b4fa]">map</span>(processNode));</div>
                      <div>&#125;</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFont(opt);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    <span>{isSelected ? 'Selected' : `Choose ${opt.label}`}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
