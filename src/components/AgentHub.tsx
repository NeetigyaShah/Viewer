import React from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { AgentInfo } from '../engine/types';

interface AgentHubProps {
  agents: AgentInfo[];
  onSelectAgent: (agent: AgentInfo) => void;
  onAddCustom: () => void;
}

export const AgentHub: React.FC<AgentHubProps> = ({ agents, onSelectAgent, onAddCustom }) => {
  return (
    <div className="flex-1 overflow-y-auto p-10 max-w-5xl mx-auto space-y-8 flex flex-col justify-center select-none">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 shadow-inner">
          <Sparkles size={12} className="text-zinc-400" />
          <span>Unified Agent Control Surface</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Choose your <span className="text-white underline decoration-zinc-600 underline-offset-8">AI Coding Agent</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Launch interactive terminal sessions with instant live Markdown rendering, LaTeX equations, and Mermaid charts.
        </p>
      </motion.div>

      {/* Agents Grid with Staggered Entrance */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.06,
            },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
      >
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
            }}
            whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSelectAgent(agent)}
            className="card-glow glass-panel p-6 rounded-2xl cursor-pointer flex flex-col justify-between group bg-[#0c0c0e] hover:bg-[#121215]"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white group-hover:bg-white group-hover:text-black transition-colors duration-200 shadow-sm">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white transition-colors">
                      {agent.name}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-500">$ {agent.command}</span>
                  </div>
                </div>

                {agent.is_installed ? (
                  <span className="flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-medium">
                    <CheckCircle size={11} />
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                    CLI
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {agent.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 group-hover:text-white transition-colors">
              <span className="font-medium">Launch Workspace</span>
              <ArrowRight size={14} className="transform group-hover:translate-x-1.5 transition-transform duration-200 text-zinc-400 group-hover:text-white" />
            </div>
          </motion.div>
        ))}

        {/* Custom Agent Button with Spring Tap */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddCustom}
          className="glass-panel p-6 rounded-2xl border-dashed border-white/[0.12] hover:border-white/[0.4] bg-transparent hover:bg-white/[0.02] cursor-pointer flex flex-col items-center justify-center space-y-2.5 text-zinc-400 hover:text-white transition-all duration-200 min-h-[160px] group"
        >
          <div className="p-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 group-hover:text-white group-hover:border-white/40 transition-colors duration-200">
            <Plus size={20} />
          </div>
          <span className="text-sm font-semibold tracking-wide text-zinc-200 group-hover:text-white">+ Add Custom CLI Agent</span>
          <span className="text-[11px] text-zinc-500">Configure command flags & environment</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
