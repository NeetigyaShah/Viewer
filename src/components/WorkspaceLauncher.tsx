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
    <div className="flex-1 flex flex-col justify-center items-center p-8 max-w-lg mx-auto space-y-6">
      <div className="w-full">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          <span>Back to Agents</span>
        </button>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-[#89b4fa]">Where do you want to work today?</h2>
        <p className="text-xs text-gray-400">
          Launching <strong className="text-white">{agent.name}</strong>
        </p>
      </div>

      <div className="w-full space-y-4 bg-[#181825] p-6 rounded-2xl border border-[#313244] shadow-xl">
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-medium flex items-center space-x-1.5">
            <Folder size={14} className="text-[#89b4fa]" />
            <span>Project Directory Path</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="flex-1 bg-[#11111b] border border-[#45475a] rounded-lg px-3.5 py-2.5 text-xs text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa]"
              placeholder="e.g. D:/MyProject"
            />
          </div>
        </div>

        <button
          onClick={() => onLaunch(folderPath)}
          className="w-full py-3 bg-[#89b4fa] text-[#11111b] rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-[#b4befe] transition-all shadow-md active:scale-[0.99]"
        >
          <Play size={16} />
          <span>Launch Workspace Session</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#313244]" />
          <span className="flex-shrink mx-3 text-[11px] text-gray-500 uppercase font-semibold">Or</span>
          <div className="flex-grow border-t border-[#313244]" />
        </div>

        <button
          onClick={() => onLaunch('')}
          className="w-full py-2.5 bg-[#313244] text-gray-300 rounded-xl text-xs flex items-center justify-center space-x-2 hover:bg-[#45475a] hover:text-white transition-all"
        >
          <Sparkles size={14} className="text-yellow-400" />
          <span>Quick Temporary Scratchpad Session</span>
        </button>
      </div>
    </div>
  );
};
