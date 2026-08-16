import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, Folder, ArrowLeft, Bot, CheckCircle } from 'lucide-react';
import { AgentInfo } from '../engine/types';

interface WorkspaceLauncherProps {
  agent: AgentInfo;
  onLaunch: (cwd: string) => void;
  onBack: () => void;
}

export const WorkspaceLauncher: React.FC<WorkspaceLauncherProps> = ({ agent, onLaunch, onBack }) => {
  const [folderPath, setFolderPath] = useState('D:/Viewer');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col justify-center items-center p-8 max-w-lg mx-auto space-y-6 select-none w-full"
    >
      <div className="w-full">
        <motion.button
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Agents</span>
        </motion.button>
      </div>

      {/* Selected Agent Header Pill */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="flex items-center space-x-3 px-4 py-2 rounded-2xl glass-panel border border-white/[0.12] shadow-lg"
      >
        <div className="p-2 rounded-xl bg-white text-black font-bold">
          <Bot size={18} />
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-white">{agent.name}</div>
          <div className="text-[11px] font-mono text-zinc-500">$ {agent.command}</div>
        </div>
        {agent.is_installed && (
          <span className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-medium ml-2">
            <CheckCircle size={10} />
            <span>Ready</span>
          </span>
        )}
      </motion.div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">Where do you want to work today?</h2>
        <p className="text-xs text-zinc-400">Choose a local repository or start a scratchpad session</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3 }}
        className="w-full space-y-4 bg-[#0c0c0e] p-6 rounded-2xl border border-white/[0.08] shadow-2xl"
      >
        <div className="space-y-2">
          <label className="text-xs text-zinc-300 font-medium flex items-center space-x-1.5">
            <Folder size={14} className="text-zinc-400" />
            <span>Project Directory Path</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="flex-1 bg-[#141417] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 transition-colors"
              placeholder="e.g. D:/MyProject"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.015, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onLaunch(folderPath)}
          className="w-full py-3 bg-white text-black rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-zinc-200 transition-all shadow-md active:scale-[0.99] cursor-pointer"
        >
          <Play size={15} className="fill-black" />
          <span>Launch Workspace Session</span>
        </motion.button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/[0.06]" />
          <span className="flex-shrink mx-3 text-[11px] text-zinc-600 uppercase font-semibold">Or</span>
          <div className="flex-grow border-t border-white/[0.06]" />
        </div>

        <motion.button
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onLaunch('')}
          className="w-full py-2.5 bg-white/[0.04] text-zinc-300 rounded-xl text-xs flex items-center justify-center space-x-2 hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.06] cursor-pointer"
        >
          <Sparkles size={13} className="text-zinc-400" />
          <span>Quick Temporary Scratchpad Session</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
