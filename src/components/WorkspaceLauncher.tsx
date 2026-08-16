import React, { useState } from 'react';
import { Play, Sparkles, Folder, ArrowLeft } from 'lucide-react';
import { AgentInfo } from '../engine/types';

interface WorkspaceLauncherProps {
  agent: AgentInfo;
  onLaunch: (cwd: string) => void;
  onBack: () => void;
}

export const WorkspaceLauncher: React.FC<WorkspaceLauncherProps> = ({ agent, onLaunch, onBack }) => {
  const [folderPath, setFolderPath] = useState('D:/Viewer');

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-8 max-w-lg mx-auto space-y-6 select-none">
      <div className="w-full">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back to Agents</span>
        </button>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Where do you want to work today?</h2>
        <p className="text-xs text-zinc-400">
          Launching <strong className="text-white">{agent.name}</strong>
        </p>
      </div>

      <div className="w-full space-y-4 bg-[#0c0c0e] p-6 rounded-2xl border border-white/[0.08] shadow-2xl">
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

        <button
          onClick={() => onLaunch(folderPath)}
          className="w-full py-3 bg-white text-black rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-zinc-200 transition-all shadow-md active:scale-[0.99]"
        >
          <Play size={15} className="fill-black" />
          <span>Launch Workspace Session</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/[0.06]" />
          <span className="flex-shrink mx-3 text-[11px] text-zinc-600 uppercase font-semibold">Or</span>
          <div className="flex-grow border-t border-white/[0.06]" />
        </div>

        <button
          onClick={() => onLaunch('')}
          className="w-full py-2.5 bg-white/[0.04] text-zinc-300 rounded-xl text-xs flex items-center justify-center space-x-2 hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.06]"
        >
          <Sparkles size={13} className="text-zinc-400" />
          <span>Quick Temporary Scratchpad Session</span>
        </button>
      </div>
    </div>
  );
};
