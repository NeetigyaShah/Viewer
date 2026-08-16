import React from 'react';
import { Bot, Folder, ChevronLeft, ChevronRight, Sparkles, Terminal } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: 'workspace' | 'agents' | 'settings';
  onSelectView: (view: 'workspace' | 'agents' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeView,
  onSelectView,
}) => {
  return (
    <div
      className={`bg-[#000000] border-r border-white/[0.08] flex flex-col justify-between select-none transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="space-y-4">
        {/* App Logo */}
        <div className="p-3.5 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-white text-black font-bold">
              <Terminal size={15} />
            </div>
            {!collapsed && <span className="font-bold text-sm tracking-tight text-white">Viewer</span>}
          </div>
          <button
            onClick={onToggleCollapse}
            className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-2 space-y-1">
          <button
            onClick={() => onSelectView('workspace')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
              activeView === 'workspace'
                ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.12] shadow-sm'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white border border-transparent'
            }`}
          >
            <Folder size={16} className={activeView === 'workspace' ? 'text-white' : 'text-zinc-400'} />
            {!collapsed && <span>Workspace</span>}
          </button>

          <button
            onClick={() => onSelectView('agents')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
              activeView === 'agents'
                ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.12] shadow-sm'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white border border-transparent'
            }`}
          >
            <Bot size={16} className={activeView === 'agents' ? 'text-white' : 'text-zinc-400'} />
            {!collapsed && <span>Agent Hub</span>}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-white/[0.08]">
        <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
          <Sparkles size={12} className="text-zinc-400" />
          {!collapsed && <span>AI Workspace v0.1.0</span>}
        </div>
      </div>
    </div>
  );
};
