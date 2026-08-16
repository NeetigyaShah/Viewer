import React, { useState } from 'react';
import { MarkdownBlock } from '../engine/types';
import { tokenizeAnsi } from '../engine/ansiTokenizer';
import { CodeBlock } from './renderers/CodeBlock';
import { MermaidBlock } from './renderers/MermaidBlock';
import { MathBlock } from './renderers/MathBlock';
import { SvgBlock } from './renderers/SvgBlock';
import { DiffBlock } from './renderers/DiffBlock';
import { Download, ListCollapse, BookOpen } from 'lucide-react';

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
    <div className="flex-1 flex overflow-hidden bg-[#1e1e2e] text-[#cdd6f4] relative">
      {/* Table of Contents Sidebar */}
      {showToc && (
        <div className="w-64 bg-[#181825] border-r border-[#313244] p-4 overflow-y-auto text-xs space-y-2 select-none shadow-xl z-20">
          <div className="flex justify-between items-center pb-2 border-b border-[#313244] font-semibold text-[#89b4fa]">
            <span className="flex items-center space-x-1.5">
              <BookOpen size={14} />
              <span>Table of Contents</span>
            </span>
            <button onClick={() => setShowToc(false)} className="text-gray-400 hover:text-white">
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
                  className="truncate text-gray-300 hover:text-[#89b4fa] cursor-pointer py-0.5"
                >
                  • {text}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Canvas Quick Actions */}
        <div className="flex justify-between items-center px-6 py-2 bg-[#181825]/60 border-b border-[#313244]/60 text-xs">
          <button
            onClick={() => setShowToc(!showToc)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors ${
              showToc ? 'bg-[#89b4fa] text-[#11111b] font-semibold' : 'bg-[#313244] hover:bg-[#45475a] text-gray-200'
            }`}
          >
            <ListCollapse size={13} />
            <span>TOC ({headings.length})</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#313244] hover:bg-[#45475a] text-gray-200 transition-colors"
          >
            <Download size={13} />
            <span>Export .MD</span>
          </button>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 max-w-4xl mx-auto w-full">
          {blocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-500 space-y-3">
              <div className="p-4 rounded-full bg-[#181825] border border-[#313244] text-[#89b4fa]">
                <BookOpen size={32} />
              </div>
              <h3 className="text-base font-semibold text-gray-400">Waiting for agent output...</h3>
              <p className="text-xs max-w-sm text-gray-500">
                Type commands in the terminal pane to interact with the agent. Markdown, code, diagrams, and formulas will render live here.
              </p>
            </div>
          ) : (
            blocks.map((block) => {
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
                    <h1 key={block.id} className="text-2xl font-bold text-[#89b4fa] border-b border-[#313244] pb-2 mt-6 mb-3">
                      {renderColoredText(text)}
                    </h1>
                  );
                }
                if (level === 2) {
                  return (
                    <h2 key={block.id} className="text-xl font-semibold text-[#89b4fa] mt-5 mb-2">
                      {renderColoredText(text)}
                    </h2>
                  );
                }
                return (
                  <h3 key={block.id} className="text-lg font-medium text-[#cba6f7] mt-4 mb-1">
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
                      ? 'p-4 bg-[#181825] rounded-xl border border-[#313244] shadow-sm leading-relaxed text-sm'
                      : 'leading-relaxed text-sm my-2'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{renderColoredText(block.rawContent)}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
