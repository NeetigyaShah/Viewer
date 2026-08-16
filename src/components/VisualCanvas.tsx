import React, { useState } from 'react';
import { MarkdownBlock } from '../engine/types';
import { tokenizeAnsi } from '../engine/ansiTokenizer';
import { CodeBlock } from './renderers/CodeBlock';
import { MermaidBlock } from './renderers/MermaidBlock';
import { MathBlock } from './renderers/MathBlock';
import { SvgBlock } from './renderers/SvgBlock';
import { DiffBlock } from './renderers/DiffBlock';
import { Download, ListCollapse, BookOpen, Bot, User, Sparkles } from 'lucide-react';

interface VisualCanvasProps {
  blocks: MarkdownBlock[];
  viewMode: 'chat' | 'document';
  rawText?: string;
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({ blocks, viewMode, rawText = '' }) => {
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

  return (
    <div className="flex-1 flex overflow-hidden bg-[#09090b] text-[#f4f4f5] relative">
      {/* Table of Contents Sidebar */}
      {showToc && (
        <div className="w-64 glass-panel border-r border-white/[0.08] p-4 overflow-y-auto text-xs space-y-2 select-none shadow-2xl z-20 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.08] font-semibold text-[#89b4fa]">
            <span className="flex items-center space-x-1.5">
              <BookOpen size={14} />
              <span>Table of Contents</span>
            </span>
            <button onClick={() => setShowToc(false)} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          {headings.length === 0 ? (
            <p className="text-gray-500 italic py-2">No headings detected yet.</p>
          ) : (
            headings.map((h, i) => {
              const level = (h.rawContent.match(/^#+/) || ['#'])[0].length;
              const text = h.rawContent.replace(/^#+\s*/, '');
              return (
                <div
                  key={i}
                  style={{ paddingLeft: `${(level - 1) * 12}px` }}
                  className="truncate text-[#a1a1aa] hover:text-[#89b4fa] cursor-pointer py-1 transition-colors"
                >
                  • {text}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Quick Actions Header */}
        <div className="flex justify-between items-center px-6 py-2.5 glass-panel border-b border-white/[0.08] text-xs">
          <button
            onClick={() => setShowToc(!showToc)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
              showToc
                ? 'bg-[#89b4fa] text-[#11111b] font-semibold shadow-md'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#a1a1aa] hover:text-white border border-white/[0.06]'
            }`}
          >
            <ListCollapse size={13} />
            <span>TOC ({headings.length})</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#a1a1aa] hover:text-white border border-white/[0.06] transition-all duration-200"
          >
            <Download size={13} />
            <span>Export .MD</span>
          </button>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto w-full">
          {blocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-500 space-y-4">
              <div className="p-4 rounded-2xl glass-panel border border-white/[0.08] text-[#89b4fa] shadow-xl">
                <Sparkles size={32} className="text-[#89b4fa]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Live Markdown Stream Ready</h3>
                <p className="text-xs max-w-sm text-[#71717a] leading-relaxed">
                  Start typing in the terminal. Formatted text, syntax-highlighted code, LaTeX math, and Mermaid charts will appear here in real time.
                </p>
              </div>
            </div>
          ) : (
            blocks.map((block, index) => {
              const isLast = index === blocks.length - 1;

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
                    <h2 key={block.id} className="text-xl font-bold text-[#89b4fa] mt-6 mb-3">
                      {renderColoredText(text)}
                    </h2>
                  );
                }
                return (
                  <h3 key={block.id} className="text-base font-semibold text-[#cba6f7] mt-4 mb-2">
                    {renderColoredText(text)}
                  </h3>
                );
              }

              // Paragraph / Text Block
              const isChat = viewMode === 'chat';
              return (
                <div
                  key={block.id}
                  className={
                    isChat
                      ? 'p-5 rounded-2xl glass-panel border border-white/[0.08] shadow-sm leading-relaxed text-sm'
                      : 'leading-relaxed text-sm my-3'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-[#f4f4f5]">
                    {renderColoredText(block.rawContent)}
                    {isLast && !block.isComplete && <span className="streaming-cursor" />}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
