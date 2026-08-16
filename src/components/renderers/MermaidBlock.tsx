import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#181825',
    primaryColor: '#89b4fa',
    primaryTextColor: '#cdd6f4',
    lineColor: '#89b4fa',
    textColor: '#cdd6f4',
  },
});

interface MermaidBlockProps {
  code: string;
  isComplete: boolean;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, isComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isComplete || !code.trim()) return;

    const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
    setError(null);

    mermaid
      .render(id, code)
      .then((res) => {
        setSvg(res.svg);
      })
      .catch((err) => {
        setError(String(err));
      });
  }, [code, isComplete]);

  if (!isComplete) {
    return (
      <div className="my-3 p-4 rounded-lg border border-dashed border-[#89b4fa]/40 bg-[#181825] flex items-center space-x-2 text-xs text-[#89b4fa] animate-pulse">
        <span className="h-2 w-2 rounded-full bg-[#89b4fa]" />
        <span>Generating Mermaid diagram...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-3 p-3 rounded-lg bg-[#181825] border border-red-500/30 text-xs font-mono text-red-400">
        <div className="text-[11px] font-semibold uppercase text-red-500 mb-1">Diagram Render Error</div>
        <pre className="text-gray-400 whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 p-4 rounded-lg bg-[#181825] border border-[#313244] overflow-x-auto flex justify-center shadow-lg"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
