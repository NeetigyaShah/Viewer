import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Search, ArrowRight, Bot, Trash2, Calendar, Folder } from 'lucide-react';
import { SavedSession } from '../engine/types';

interface HistoryDrawerProps {
  sessions: SavedSession[];
  onSelectSession: (session: SavedSession) => void;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  sessions,
  onSelectSession,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.agentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6 select-none">
      <div className="flex justify-between items-center pb-4 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white">
            <History size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Session History</h1>
            <p className="text-xs text-zinc-400">Search and restore past agent conversations</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          Back to Workspace
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-3 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search past conversations, code, or topics..."
          className="w-full bg-[#0c0c0e] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 transition-colors"
        />
      </div>

      {/* Session Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 space-y-2">
            <Calendar size={32} className="mx-auto text-zinc-600" />
            <p className="text-xs">No saved sessions found.</p>
          </div>
        ) : (
          filtered.map((session) => {
            const dateStr = new Date(session.timestamp).toLocaleString();
            return (
              <motion.div
                key={session.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectSession(session)}
                className="card-glow glass-panel p-5 rounded-xl cursor-pointer flex justify-between items-center group bg-[#0c0c0e] hover:bg-[#121215] transition-all"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-semibold text-white group-hover:text-white transition-colors">
                      {session.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                      {session.agentName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-[11px] text-zinc-500">
                    <span className="flex items-center space-x-1">
                      <Folder size={11} />
                      <span className="truncate max-w-[200px]">{session.cwd || 'Scratchpad'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar size={11} />
                      <span>{dateStr}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-zinc-500 group-hover:text-white transition-colors">
                  <span className="text-xs font-medium">Reopen</span>
                  <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
