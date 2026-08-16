import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, Terminal, Wrench, Search, FileCode } from 'lucide-react';

interface PromptBarProps {
  onSend: (prompt: string) => void;
  onInterrupt: () => void;
  isStreaming?: boolean;
  agentName?: string;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSend,
  onInterrupt,
  isStreaming = false,
  agentName = 'Agent',
}) => {
  const [input, setInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChipClick = (template: string) => {
    setInput(template);
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 pb-6 pt-2 select-none">
      {/* Quick Action Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-[11px]">
        <button
          onClick={() => handleChipClick('Explain what you just did and next steps')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-panel hover:border-white/[0.2] text-[#a1a1aa] hover:text-white transition-all whitespace-nowrap active:scale-95"
        >
          <Sparkles size={11} className="text-yellow-400" />
          <span>Explain</span>
        </button>

        <button
          onClick={() => handleChipClick('Run tests and fix any failing errors')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-panel hover:border-white/[0.2] text-[#a1a1aa] hover:text-white transition-all whitespace-nowrap active:scale-95"
        >
          <Wrench size={11} className="text-[#89b4fa]" />
          <span>Run Tests & Fix</span>
        </button>

        <button
          onClick={() => handleChipClick('Search the codebase for ')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-panel hover:border-white/[0.2] text-[#a1a1aa] hover:text-white transition-all whitespace-nowrap active:scale-95"
        >
          <Search size={11} className="text-[#a6e3a1]" />
          <span>Search Code</span>
        </button>

        <button
          onClick={() => handleChipClick('Draft an implementation plan for ')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-panel hover:border-white/[0.2] text-[#a1a1aa] hover:text-white transition-all whitespace-nowrap active:scale-95"
        >
          <FileCode size={11} className="text-[#cba6f7]" />
          <span>Draft Plan</span>
        </button>

        <button
          onClick={onInterrupt}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-300 transition-all whitespace-nowrap active:scale-95"
          title="Send Ctrl+C"
        >
          <Square size={10} className="text-red-400 fill-red-400" />
          <span>Interrupt (Ctrl+C)</span>
        </button>
      </div>

      {/* Floating Prompt Bar */}
      <div className="relative glass-panel rounded-2xl p-2 shadow-2xl border border-white/[0.12] focus-within:border-[#89b4fa]/50 focus-within:shadow-[#89b4fa]/10 transition-all duration-200">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}... (Enter to send, Shift+Enter for new line)`}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#71717a] px-3 py-2 resize-none focus:outline-none max-h-40 overflow-y-auto leading-relaxed"
          />

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              input.trim() && !isStreaming
                ? 'bg-[#89b4fa] text-[#11111b] hover:bg-[#b4befe] shadow-md cursor-pointer active:scale-95'
                : 'bg-white/[0.04] text-gray-600 cursor-not-allowed'
            }`}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
