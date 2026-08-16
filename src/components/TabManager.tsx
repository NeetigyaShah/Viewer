import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="flex items-center bg-[#09090b] border-b border-white/[0.08] px-3 h-11 select-none">
      <div className="flex space-x-1.5 flex-1 overflow-x-auto items-center">
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <motion.div
                key={tab.id}
                layout
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-colors duration-150 ${
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
                  className="hover:text-red-400 hover:bg-white/[0.08] p-0.5 rounded-md transition-colors text-zinc-500 ml-1"
                  title="Close Tab"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.94 }}
        onClick={onNewTab}
        className="btn-tactile p-2 hover:bg-white/[0.08] rounded-xl text-zinc-400 hover:text-white ml-2 transition-colors flex items-center space-x-1.5 text-xs border border-white/[0.06] hover:border-white/[0.14] shadow-sm"
        title="Open New Agent Session"
      >
        <Plus size={14} />
        <span className="hidden md:inline font-medium">New Session</span>
      </motion.button>
    </div>
  );
};
