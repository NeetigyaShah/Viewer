import React from 'react';
import { Bot, CheckCircle, Plus, Terminal as TermIcon, Sparkles, ArrowRight } from 'lucide-react';
import { AgentInfo } from '../engine/types';

interface AgentHubProps {
  agents: AgentInfo[];
  onSelectAgent: (agent: AgentInfo) => void;
  onAddCustom: () => void;
}

export const AgentHub: React.FC<AgentHubProps> = ({ agents, onSelectAgent, onAddCustom }) => {
  return (
    <div className="flex-1 overflow-y-auto p-10 max-w-5xl mx-auto space-y-8 flex flex-col justify-center">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-[#89b4fa] shadow-inner">
          <Sparkles size={13} className="text-yellow-400" />
          <span>Unified Agent Control Surface</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Choose your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#89b4fa] to-[#cba6f7]">AI Coding Agent</span>
        </h1>
        <p className="text-sm text-[#a1a1aa] max-w-md mx-auto leading-relaxed">
          Launch interactive terminal sessions with instant live Markdown rendering, LaTeX equations, and Mermaid charts.
        </p>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className="glow-card glass-panel p-6 rounded-2xl cursor-pointer flex flex-col justify-between group transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#89b4fa] group-hover:bg-[#89b4fa] group-hover:text-[#11111b] transition-colors duration-200 shadow-sm">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white group-hover:text-[#89b4fa] transition-colors">
                      {agent.name}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-500">$ {agent.command}</span>
                  </div>
                </div>

                {agent.is_installed ? (
                  <span className="flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 font-medium">
                    <CheckCircle size={11} />
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-400 border border-white/[0.06]">
                    CLI
                  </span>
                )}
              </div>

              <p className="text-xs text-[#a1a1aa] leading-relaxed line-clamp-2">
                {agent.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#71717a] group-hover:text-[#89b4fa] transition-colors">
              <span className="font-medium">Launch Workspace</span>
              <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}

        {/* Custom Agent Button */}
        <div
          onClick={onAddCustom}
          className="glass-panel p-6 rounded-2xl border-dashed border-white/[0.12] hover:border-[#89b4fa]/60 bg-transparent hover:bg-white/[0.02] cursor-pointer flex flex-col items-center justify-center space-y-2.5 text-gray-400 hover:text-white transition-all duration-200 min-h-[160px] group"
        >
          <div className="p-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400 group-hover:text-[#89b4fa] group-hover:border-[#89b4fa]/40 transition-colors">
            <Plus size={20} />
          </div>
          <span className="text-sm font-semibold tracking-wide">+ Add Custom CLI Agent</span>
          <span className="text-[11px] text-gray-500">Configure command flags & environment</span>
        </div>
      </div>
    </div>
  );
};
