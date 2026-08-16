import React, { useState, useEffect } from 'react';
import { AgentInfo, SessionTab, DockPosition, ViewMode, MarkdownBlock } from './engine/types';
import { ptyClient } from './engine/ptyClient';
import { BlockStreamBuffer } from './engine/blockBuffer';
import { Sidebar } from './components/Sidebar';
import { TabManager } from './components/TabManager';
import { AgentHub } from './components/AgentHub';
import { WorkspaceLauncher } from './components/WorkspaceLauncher';
import { TerminalDock } from './components/TerminalDock';
import { VisualCanvas } from './components/VisualCanvas';
import { PanelBottom, PanelLeft, PanelRight, Maximize2, EyeOff, MessageSquare, FileText } from 'lucide-react';
import './styles/theme.css';

export function App() {
  const [activeView, setActiveView] = useState<'workspace' | 'agents' | 'settings'>('agents');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  // Workspace Multi-Tab State
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [dockPosition, setDockPosition] = useState<DockPosition>('bottom');
  const [viewMode, setViewMode] = useState<ViewMode>('document');

  // Per-Tab Buffers & Markdown Blocks
  const [buffers, setBuffers] = useState<Record<string, BlockStreamBuffer>>({});
  const [blocks, setBlocks] = useState<Record<string, MarkdownBlock[]>>({});

  useEffect(() => {
    ptyClient.scanAgents().then((list) => {
      setAgents(list);
    });
  }, []);

  const handleSelectAgent = (agent: AgentInfo) => {
    setSelectedAgent(agent);
    setIsLaunching(true);
  };

  const handleLaunchSession = async (cwd: string) => {
    if (!selectedAgent) return;

    const sessionId = `session-${Date.now()}`;
    const folderName = cwd ? cwd.split(/[\/\\]/).pop() || 'Project' : 'Scratchpad';
    const newTab: SessionTab = {
      id: sessionId,
      title: `${selectedAgent.name} (${folderName})`,
      agentId: selectedAgent.id,
      cwd,
      status: 'running',
      active: true,
    };

    setTabs((prev) => [...prev.map((t) => ({ ...t, active: false })), newTab]);
    setActiveTabId(sessionId);

    const buf = new BlockStreamBuffer();
    setBuffers((prev) => ({ ...prev, [sessionId]: buf }));
    setBlocks((prev) => ({ ...prev, [sessionId]: [] }));

    await ptyClient.spawnPty(sessionId, selectedAgent.command, [], cwd);

    setIsLaunching(false);
    setActiveView('workspace');
  };

  const handleOutput = (sessionId: string, chunk: string) => {
    const buf = buffers[sessionId];
    if (buf) {
      const updatedBlocks = buf.append(chunk);
      setBlocks((prev) => ({
        ...prev,
        [sessionId]: [...updatedBlocks],
      }));
    }
  };

  const handleSendPrompt = (text: string) => {
    if (!activeTabId) return;
    ptyClient.writePty(activeTabId, `${text}\n`);

    // Optionally append user turn
    const buf = buffers[activeTabId];
    if (buf) {
      const updatedBlocks = buf.append(`\n> 👤 **User**: ${text}\n\n`);
      setBlocks((prev) => ({
        ...prev,
        [activeTabId]: [...updatedBlocks],
      }));
    }
  };

  const handleInterrupt = () => {
    if (!activeTabId) return;
    ptyClient.writePty(activeTabId, '\x03'); // Send SIGINT (Ctrl+C)
  };

  const handleCloseTab = (id: string) => {
    ptyClient.killPty(id);
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id && next.length > 0) {
        setActiveTabId(next[0].id);
        next[0].active = true;
      }
      return next;
    });
  };

  const currentTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-screen w-screen flex bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none">
      {/* Collapsible Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          if (v === 'agents') {
            setIsLaunching(false);
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'agents' ? (
          isLaunching && selectedAgent ? (
            <WorkspaceLauncher
              agent={selectedAgent}
              onLaunch={handleLaunchSession}
              onBack={() => setIsLaunching(false)}
            />
          ) : (
            <AgentHub
              agents={agents}
              onSelectAgent={handleSelectAgent}
              onAddCustom={() => {
                const cmd = prompt('Enter CLI command name (e.g. "my-agent"):');
                if (cmd) {
                  const customAgent: AgentInfo = {
                    id: `custom-${Date.now()}`,
                    name: cmd.toUpperCase(),
                    command: cmd,
                    is_installed: true,
                    description: 'User-configured custom CLI agent',
                  };
                  setAgents((prev) => [...prev, customAgent]);
                  handleSelectAgent(customAgent);
                }
              }}
            />
          )
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Multi-Tab Bar */}
            <TabManager
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={(id) => {
                setActiveTabId(id);
                setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
              }}
              onNewTab={() => {
                setActiveView('agents');
                setIsLaunching(false);
              }}
              onCloseTab={handleCloseTab}
            />

            {tabs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-gray-500 p-8 text-center">
                <div className="p-4 rounded-2xl glass-panel border border-white/[0.08]">
                  <MessageSquare size={32} className="text-[#89b4fa]" />
                </div>
                <h2 className="text-lg font-semibold text-white">No Active Agent Sessions</h2>
                <p className="text-xs text-[#71717a] max-w-sm">
                  Launch a new session from the Agent Hub to start interacting with your coding agents.
                </p>
                <button
                  onClick={() => setActiveView('agents')}
                  className="px-5 py-2.5 bg-[#89b4fa] text-[#11111b] rounded-xl text-xs font-semibold hover:bg-[#b4befe] transition-all shadow-md active:scale-95"
                >
                  Open Agent Hub
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Workspace Top Toolbar */}
                <div className="flex justify-between items-center px-6 py-2.5 glass-panel border-b border-white/[0.08] text-xs">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'chat' ? 'document' : 'chat')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        viewMode === 'chat'
                          ? 'bg-[#89b4fa] text-[#11111b] font-semibold shadow-md'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#a1a1aa] hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {viewMode === 'chat' ? <MessageSquare size={13} /> : <FileText size={13} />}
                      <span>{viewMode === 'chat' ? 'Chat Cards Mode' : 'Living .MD Mode'}</span>
                    </button>
                  </div>

                  {/* Terminal Dock Controls */}
                  <div className="flex items-center space-x-1 glass-panel p-1 rounded-xl border border-white/[0.08]">
                    <span className="text-[11px] text-gray-500 px-2 font-medium">Dock:</span>
                    <button
                      onClick={() => setDockPosition('bottom')}
                      title="Dock Bottom"
                      className={`p-1.5 rounded-lg transition-colors ${
                        dockPosition === 'bottom' ? 'bg-[#89b4fa] text-[#11111b]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <PanelBottom size={13} />
                    </button>
                    <button
                      onClick={() => setDockPosition('left')}
                      title="Dock Left"
                      className={`p-1.5 rounded-lg transition-colors ${
                        dockPosition === 'left' ? 'bg-[#89b4fa] text-[#11111b]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <PanelLeft size={13} />
                    </button>
                    <button
                      onClick={() => setDockPosition('right')}
                      title="Dock Right"
                      className={`p-1.5 rounded-lg transition-colors ${
                        dockPosition === 'right' ? 'bg-[#89b4fa] text-[#11111b]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <PanelRight size={13} />
                    </button>
                    <button
                      onClick={() => setDockPosition('float')}
                      title="Floating Window"
                      className={`p-1.5 rounded-lg transition-colors ${
                        dockPosition === 'float' ? 'bg-[#89b4fa] text-[#11111b]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      onClick={() => setDockPosition('hidden')}
                      title="Hide Terminal"
                      className={`p-1.5 rounded-lg transition-colors ${
                        dockPosition === 'hidden' ? 'bg-[#89b4fa] text-[#11111b]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <EyeOff size={13} />
                    </button>
                  </div>
                </div>

                {/* Main Workspace Split (Canvas + Terminal) */}
                <div className={`flex-1 flex ${dockPosition === 'bottom' ? 'flex-col' : 'flex-row'} overflow-hidden relative`}>
                  {dockPosition === 'left' && activeTabId && (
                    <TerminalDock
                      sessionId={activeTabId}
                      dockPosition={dockPosition}
                      onOutput={(chunk) => handleOutput(activeTabId, chunk)}
                    />
                  )}

                  <VisualCanvas
                    blocks={blocks[activeTabId] || []}
                    viewMode={viewMode}
                    rawText={buffers[activeTabId]?.getText() || ''}
                    onSendPrompt={handleSendPrompt}
                    onInterrupt={handleInterrupt}
                    agentName={currentTab?.title.split(' (')[0] || 'Agent'}
                  />

                  {(dockPosition === 'bottom' || dockPosition === 'right' || dockPosition === 'float') && activeTabId && (
                    <TerminalDock
                      sessionId={activeTabId}
                      dockPosition={dockPosition}
                      onOutput={(chunk) => handleOutput(activeTabId, chunk)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
