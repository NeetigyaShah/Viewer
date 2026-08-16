import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownBlock } from '../engine/types';
import { tokenizeAnsi } from '../engine/ansiTokenizer';
import { CodeBlock } from './renderers/CodeBlock';
import { MermaidBlock } from './renderers/MermaidBlock';
import { MathBlock } from './renderers/MathBlock';
import { SvgBlock } from './renderers/SvgBlock';
import { DiffBlock } from './renderers/DiffBlock';
import { ThinkingBlock } from './renderers/ThinkingBlock';
import { PromptBar } from './PromptBar';
import { Download, ListCollapse, BookOpen, Sparkles, Wrench, Search, FileCode } from 'lucide-react';

interface VisualCanvasProps {
  blocks: MarkdownBlock[];
  viewMode: 'chat' | 'document';
  rawText?: string;
  onSendPrompt?: (text: string) => void;
  onInterrupt?: () => void;
  isStreaming?: boolean;
  agentName?: string;
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({
  blocks,
  viewMode,
  rawText = '',
  onSendPrompt,
  onInterrupt,
  isStreaming = false,
  agentName = 'Agent',
}) => {
  const [showToc, setShowToc] = useState<boolean>(false);

  const headings = blocks.filter((b) => b.type === 'heading');

  const handleExportMarkdown = () => {
    const blob = new Blob([rawText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-session-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderColoredText = (text: string) => {
    const tokens = tokenizeAnsi(text);
    return tokens.map((token, idx) => (
      <span
        key={idx}
        style={{
          color: token.color || undefined,
          backgroundColor: token.bgColor || undefined,
          fontWeight: token.bold ? 'bold' : undefined,
          fontStyle: token.italic ? 'italic' : undefined,
          textDecoration: token.underline ? 'underline' : undefined,
        }}
      >
        {token.text}
      </span>
    ));
  };

  const starterCards = [
    { title: 'Explain Architecture', desc: 'Summarize the structure and data flow of this project', prompt: 'Explain the architecture and codebase structure of this repository in detail', icon: <Sparkles size={16} className="text-zinc-400" /> },
    { title: 'Run Tests & Fix Errors', desc: 'Execute the test suite and resolve any breaking issues', prompt: 'Run the test suite and fix any failing errors step-by-step', icon: <Wrench size={16} className="text-zinc-400" /> },
    { title: 'Search & Inspect Code', desc: 'Find key components, functions, or patterns', prompt: 'Search the codebase for all major entrypoints and list them', icon: <Search size={16} className="text-zinc-400" /> },
    { title: 'Plan New Feature', desc: 'Draft an implementation plan with test-driven steps', prompt: 'Draft a comprehensive implementation plan for adding a new feature', icon: <FileCode size={16} className="text-zinc-400" /> },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#000000] text-[#f4f4f5] relative">
      {/* Table of Contents Sidebar */}
      <AnimatePresence>
        {showToc && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel border-r border-white/[0.08] p-4 overflow-y-auto text-xs space-y-2 select-none shadow-2xl z-20"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.08] font-semibold text-white">
              <span className="flex items-center space-x-1.5">
                <BookOpen size={14} />
                <span>Table of Contents</span>
              </span>
              <button
                onClick={() => setShowToc(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            {headings.length === 0 ? (
              <p className="text-zinc-500 italic py-2">No headings detected yet.</p>
            ) : (
              headings.map((h, i) => {
                const level = (h.rawContent.match(/^#+/) || ['#'])[0].length;
                const text = h.rawContent.replace(/^#+\s*/, '');
                return (
                  <div
                    key={i}
                    style={{ paddingLeft: `${(level - 1) * 12}px` }}
                    className="truncate text-zinc-400 hover:text-white cursor-pointer py-1 transition-colors"
                  >
                    • {text}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Quick Actions Header */}
        <div className="flex justify-between items-center px-6 py-2 glass-panel border-b border-white/[0.08] text-xs select-none">
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowToc(!showToc)}
              className={`btn-tactile flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                showToc
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06]'
              }`}
            >
              <ListCollapse size={13} />
              <span>TOC ({headings.length})</span>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExportMarkdown}
            className="btn-tactile flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-all duration-150 cursor-pointer"
          >
            <Download size={13} />
            <span>Export .MD</span>
          </motion.button>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto w-full">
          {blocks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col justify-center items-center text-center p-6 space-y-8 select-none"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  What would you like to build?
                </h2>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Ask {agentName} a question or choose a starter task below to begin.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {starterCards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSendPrompt && onSendPrompt(card.prompt)}
                    className="card-glow glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.25] bg-[#0c0c0e] hover:bg-[#121215] cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-2 group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white group-hover:bg-white group-hover:text-black transition-colors duration-150">
                        {card.icon}
                      </div>
                      <span className="text-xs font-semibold text-white group-hover:text-white transition-colors">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{card.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            blocks.map((block, index) => {
              const isLast = index === blocks.length - 1;

              // Sleek Right-Aligned User Bubble (No cheesy emoji!)
              if (block.type === 'user-prompt') {
                return (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex justify-end my-4"
                  >
                    <div className="bg-[#18181b] border border-white/[0.14] text-white px-5 py-3.5 rounded-2xl rounded-br-sm max-w-[80%] shadow-xl leading-relaxed text-sm">
                      <p className="whitespace-pre-wrap">{block.rawContent}</p>
                    </div>
                  </motion.div>
                );
              }

              if (block.type === 'thought') {
                return <ThinkingBlock key={block.id} content={block.rawContent} isComplete={block.isComplete} />;
              }

              if (block.type === 'code') {
                if (block.lang === 'mermaid') {
                  const cleanCode = block.rawContent.replace(/^```mermaid\n?/, '').replace(/```$/, '');
                  return <MermaidBlock key={block.id} code={cleanCode} isComplete={block.isComplete} />;
                }
                if (block.lang === 'svg') {
                  const cleanSvg = block.rawContent.replace(/^```svg\n?/, '').replace(/```$/, '');
                  return <SvgBlock key={block.id} svgContent={cleanSvg} />;
                }
                if (block.lang === 'diff') {
                  const cleanDiff = block.rawContent.replace(/^```diff\n?/, '').replace(/```$/, '');
                  return <DiffBlock key={block.id} diffText={cleanDiff} />;
                }
                const cleanCode = block.rawContent.replace(/^```[a-z0-9_-]*\n?/i, '').replace(/```$/, '');
                return <CodeBlock key={block.id} code={cleanCode} lang={block.lang} />;
              }

              if (block.type === 'math') {
                return <MathBlock key={block.id} math={block.rawContent} displayMode={true} />;
              }

              if (block.type === 'diff') {
                return <DiffBlock key={block.id} diffText={block.rawContent} />;
              }

              if (block.type === 'svg') {
                return <SvgBlock key={block.id} svgContent={block.rawContent} />;
              }

              if (block.type === 'heading') {
                const level = (block.rawContent.match(/^#+/) || ['#'])[0].length;
                const text = block.rawContent.replace(/^#+\s*/, '');
                if (level === 1) {
                  return (
                    <h1 key={block.id} className="text-3xl font-extrabold text-white tracking-tight border-b border-white/[0.08] pb-3 mt-8 mb-4">
                      {renderColoredText(text)}
                    </h1>
                  );
                }
                if (level === 2) {
                  return (
                    <h2 key={block.id} className="text-xl font-bold text-white mt-6 mb-3">
                      {renderColoredText(text)}
                    </h2>
                  );
                }
                return (
                  <h3 key={block.id} className="text-base font-semibold text-zinc-200 mt-4 mb-2">
                    {renderColoredText(text)}
                  </h3>
                );
              }

              // Paragraph / Text Block
              const isChat = viewMode === 'chat';
              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={
                    isChat
                      ? 'p-5 rounded-2xl glass-panel border border-white/[0.08] shadow-sm leading-relaxed text-sm'
                      : 'leading-relaxed text-sm my-3'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-zinc-100">
                    {renderColoredText(block.rawContent)}
                    {isLast && !block.isComplete && <span className="streaming-cursor" />}
                  </p>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Two-Way Floating Prompt Bar */}
        {onSendPrompt && (
          <PromptBar
            onSend={onSendPrompt}
            onInterrupt={onInterrupt || (() => {})}
            isStreaming={isStreaming}
            agentName={agentName}
          />
        )}
      </div>
    </div>
  );
};
