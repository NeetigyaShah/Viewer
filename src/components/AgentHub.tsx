import React from 'react';
import { Bot, CheckCircle, Plus, Terminal as TermIcon } from 'lucide-react';
import { AgentInfo } from '../engine/types';

interface AgentHubProps {
  agents: AgentInfo[];
  onSelectAgent: (agent: AgentInfo) => void;
  onAddCustom: () => void;
}

export const AgentHub: React.FC<AgentHubProps> = ({ agents, onSelectAgent, onAddCustom }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#89b4fa]">Select an AI Agent</h1>
        <p className="text-sm text-gray-400">Choose an installed CLI agent to launch an interactive session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className="p-5 rounded-xl border border-[#313244] bg-[#181825] hover:border-[#89b4fa] cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-[#313244] text-[#89b4fa] group-hover:bg-[#89b4fa] group-hover:text-[#11111b] transition-colors">
                    <Bot size={18} />
                  </div>
                  <span className="font-semibold text-[#cdd6f4]">{agent.name}</span>
                </div>
                {agent.is_installed ? (
                  <span className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-green-950/60 text-green-400 border border-green-500/30">
                    <CheckCircle size={10} />
                    <span>Installed</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{agent.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#313244] flex items-center justify-between text-xs text-gray-500 font-mono">
              <span>$ {agent.command}</span>
            </div>
          </div>
        ))}

        <div
          onClick={onAddCustom}
          className="p-5 rounded-xl border border-dashed border-[#45475a] hover:border-[#89b4fa] bg-[#11111b]/50 cursor-pointer flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition-all min-h-[140px]"
        >
          <Plus size={24} className="text-[#89b4fa]" />
          <span className="text-sm font-medium">+ Add Custom CLI Agent</span>
        </div>
      </div>
    </div>
  );
};
