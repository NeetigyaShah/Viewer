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
        background: '#181825',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selectionBackground: '#585b70',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#cba6f7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#cba6f7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8',
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
    if (dockPosition === 'bottom') return 'h-64 w-full border-t border-[#313244]';
    if (dockPosition === 'left') return 'h-full w-96 border-r border-[#313244]';
    if (dockPosition === 'right') return 'h-full w-96 border-l border-[#313244]';
    if (dockPosition === 'float') {
      return 'fixed bottom-8 right-8 w-[600px] h-[360px] rounded-xl shadow-2xl border border-[#89b4fa]/50 z-50 overflow-hidden';
    }
    return 'h-64 w-full';
  };

  return (
    <div className={`flex flex-col bg-[#181825] ${getContainerStyle()}`}>
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#11111b] text-xs text-gray-400 border-b border-[#313244] select-none">
        <div className="flex items-center space-x-2">
          <TermIcon size={13} className="text-[#89b4fa]" />
          <span className="font-semibold text-gray-300">Terminal (Session: {sessionId.slice(-6)})</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-gray-500 uppercase">{dockPosition}</span>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
};
