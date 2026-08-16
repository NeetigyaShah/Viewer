import React from 'react';
import { Plus, X, Terminal, Bot } from 'lucide-react';
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
    <div className="flex items-center bg-[#11111b] border-b border-[#313244] px-2 h-10 select-none">
      <div className="flex space-x-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'bg-[#181825] text-[#cdd6f4] border-[#89b4fa] font-medium'
                  : 'bg-[#11111b] text-gray-400 border-transparent hover:bg-[#1e1e2e] hover:text-gray-200'
              }`}
            >
              <Bot size={13} className={isActive ? 'text-[#89b4fa]' : 'text-gray-500'} />
              <span className="truncate max-w-[160px]">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="hover:text-red-400 p-0.5 rounded transition-colors"
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
        className="p-1.5 hover:bg-[#313244] rounded text-gray-300 ml-2 transition-colors flex items-center space-x-1 text-xs"
        title="Open New Agent Session"
      >
        <Plus size={14} />
        <span className="hidden md:inline">New Session</span>
      </button>
    </div>
  );
};
