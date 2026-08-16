import React from 'react';
import { Plus, X, Bot } from 'lucide-react';
import { SessionTab } from '../engine/types';

interface TabManagerProps {
  tabs: SessionTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
}

export const TabManager: React.FC<TabManagerProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
}) => {
  return (
    <div className="flex items-center bg-[#09090b] border-b border-white/[0.08] px-2 h-10 select-none">
      <div className="flex space-x-1.5 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] text-white border border-white/[0.14] font-medium shadow-sm'
                  : 'bg-transparent text-zinc-400 border border-transparent hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              <Bot size={13} className={isActive ? 'text-white' : 'text-zinc-500'} />
              <span className="truncate max-w-[160px]">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="hover:text-red-400 p-0.5 rounded transition-colors text-zinc-500"
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNewTab}
        className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-white ml-2 transition-colors flex items-center space-x-1 text-xs border border-transparent hover:border-white/[0.08]"
        title="Open New Agent Session"
      >
        <Plus size={14} />
        <span className="hidden md:inline font-medium">New Session</span>
      </button>
    </div>
  );
};
