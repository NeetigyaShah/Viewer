import React from 'react';
import { Bot, Folder, Settings, Terminal, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

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
      className={`bg-[#11111b] border-r border-[#313244] flex flex-col justify-between select-none transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="space-y-4">
        {/* App Logo */}
        <div className="p-3.5 flex items-center justify-between border-b border-[#313244]">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-[#89b4fa] text-[#11111b]">
              <Terminal size={16} />
            </div>
            {!collapsed && <span className="font-bold text-sm text-[#89b4fa]">Viewer</span>}
          </div>
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#313244]"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-2 space-y-1">
          <button
            onClick={() => onSelectView('workspace')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeView === 'workspace'
                ? 'bg-[#181825] text-[#89b4fa] font-semibold border border-[#313244]'
                : 'text-gray-400 hover:bg-[#181825] hover:text-white'
            }`}
          >
            <Folder size={16} />
            {!collapsed && <span>Workspace</span>}
          </button>

          <button
            onClick={() => onSelectView('agents')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeView === 'agents'
                ? 'bg-[#181825] text-[#89b4fa] font-semibold border border-[#313244]'
                : 'text-gray-400 hover:bg-[#181825] hover:text-white'
            }`}
          >
            <Bot size={16} />
            {!collapsed && <span>Agent Hub</span>}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#313244]">
        <div className="flex items-center space-x-2 text-[11px] text-gray-500">
          <Sparkles size={13} className="text-yellow-400" />
          {!collapsed && <span>AI Workspace v0.1.0</span>}
        </div>
      </div>
    </div>
  );
};
