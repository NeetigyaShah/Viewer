import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, lang = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-[#313244] bg-[#11111b] text-left">
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#181825] text-xs text-gray-400 border-b border-[#313244]">
        <span className="font-mono uppercase text-[11px] font-semibold text-[#89b4fa]">
          {lang || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-white transition-colors text-[11px] px-2 py-0.5 rounded hover:bg-[#313244]"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto text-[#cdd6f4] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};
