import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { ptyClient } from '../engine/ptyClient';
import { DockPosition } from '../engine/types';
import { Maximize2, Minimize2, Terminal as TermIcon } from 'lucide-react';

interface TerminalDockProps {
  sessionId: string;
  dockPosition: DockPosition;
  onOutput?: (chunk: string) => void;
}

export const TerminalDock: React.FC<TerminalDockProps> = ({ sessionId, dockPosition, onOutput }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#f4f4f5',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black: '#27272a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#ffffff',
        brightBlack: '#52525b',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#e879f9',
        brightCyan: '#7dd3fc',
        brightWhite: '#ffffff',
      },
      fontFamily: 'Fira Code, JetBrains Mono, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    try {
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
    } catch {
      // Fallback if WebGL unavailable
    }

    term.open(terminalRef.current);
    fitAddon.fit();
    termInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      ptyClient.writePty(sessionId, data);
    });

    const unsubscribeOutput = ptyClient.onOutput(sessionId, (chunk) => {
      term.write(chunk);
      if (onOutput) onOutput(chunk);
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        ptyClient.resizePty(sessionId, term.cols, term.rows);
      } catch {
        // ignore resize error
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      unsubscribeOutput();
      term.dispose();
    };
  }, [sessionId]);

  if (dockPosition === 'hidden') return null;

  const getContainerStyle = () => {
    if (dockPosition === 'bottom') return 'h-64 w-full border-t border-white/[0.08]';
    if (dockPosition === 'left') return 'h-full w-96 border-r border-white/[0.08]';
    if (dockPosition === 'right') return 'h-full w-96 border-l border-white/[0.08]';
    if (dockPosition === 'float') {
      return 'fixed bottom-8 right-8 w-[600px] h-[360px] rounded-2xl shadow-2xl border border-white/[0.15] z-50 overflow-hidden bg-[#000000]';
    }
    return 'h-64 w-full';
  };

  return (
    <div className={`flex flex-col bg-[#000000] ${getContainerStyle()}`}>
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#09090b] text-xs text-zinc-400 border-b border-white/[0.08] select-none">
        <div className="flex items-center space-x-2">
          <TermIcon size={13} className="text-zinc-300" />
          <span className="font-semibold text-zinc-200">Terminal (Session: {sessionId.slice(-6)})</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-gray-500 uppercase">{dockPosition}</span>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
};
