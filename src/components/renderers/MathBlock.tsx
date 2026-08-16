import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  math: string;
  displayMode?: boolean;
}

export const MathBlock: React.FC<MathBlockProps> = ({ math, displayMode = false }) => {
  const cleanMath = math.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '');
  let html = '';

  try {
    html = katex.renderToString(cleanMath, {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return <code className="text-yellow-400 font-mono">{math}</code>;
  }

  return (
    <span
      className={displayMode ? 'block my-3 p-3 bg-[#181825] rounded-lg border border-[#313244] text-center overflow-x-auto' : 'inline-block px-1'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
