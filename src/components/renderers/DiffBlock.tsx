import React from 'react';

interface DiffBlockProps {
  diffText: string;
}

export const DiffBlock: React.FC<DiffBlockProps> = ({ diffText }) => {
  const lines = diffText.split('\n');

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[#313244] bg-[#11111b] text-left font-mono text-xs shadow-md">
      <div className="px-3 py-1.5 bg-[#181825] border-b border-[#313244] text-[11px] font-semibold text-[#89b4fa]">
        GIT DIFF
      </div>
      <div className="p-3 overflow-x-auto space-y-0.5">
        {lines.map((line, idx) => {
          if (line.startsWith('+')) {
            return (
              <div key={idx} className="bg-green-950/40 text-green-300 px-2 py-0.5 rounded -mx-1 border-l-2 border-green-400">
                {line}
              </div>
            );
          }
          if (line.startsWith('-')) {
            return (
              <div key={idx} className="bg-red-950/40 text-red-300 px-2 py-0.5 rounded -mx-1 border-l-2 border-red-400">
                {line}
              </div>
            );
          }
          if (line.startsWith('@@')) {
            return (
              <div key={idx} className="text-[#94e2d5] font-bold py-1">
                {line}
              </div>
            );
          }
          if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
            return (
              <div key={idx} className="text-gray-400 font-semibold">
                {line}
              </div>
            );
          }
          return (
            <div key={idx} className="text-gray-300 px-2">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};
