import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentInfo, SessionTab, SavedSession, DockPosition, ViewMode, MarkdownBlock } from './engine/types';
import { ptyClient } from './engine/ptyClient';
import { BlockStreamBuffer } from './engine/blockBuffer';
import { Sidebar } from './components/Sidebar';
import { TabManager } from './components/TabManager';
import { AgentHub } from './components/AgentHub';
import { WorkspaceLauncher } from './components/WorkspaceLauncher';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TerminalDock } from './components/TerminalDock';
import { VisualCanvas } from './components/VisualCanvas';
import { FontTestModal, FONT_CANDIDATES, FontOption } from './components/FontTestModal';
import {
  PanelBottom,
  PanelLeft,
  PanelRight,
  Maximize2,
  EyeOff,
  MessageSquare,
  FileText,
  ListCollapse,
  Download,
  Sparkles,
} from 'lucide-react';
import './styles/theme.css';

export function App() {
  const [activeView, setActiveView] = useState<'workspace' | 'agents' | 'history' | 'settings'>('agents');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  // Blind Font Comparison Modal State
  const [isFontModalOpen, setIsFontModalOpen] = useState<boolean>(false);
  const [selectedFont, setSelectedFont] = useState<FontOption>(FONT_CANDIDATES[0]);

  // Workspace Multi-Tab State
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [dockPosition, setDockPosition] = useState<DockPosition>('bottom');
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [showToc, setShowToc] = useState<boolean>(false);

  // Per-Tab Buffers & Markdown Blocks
  const [buffers, setBuffers] = useState<Record<string, BlockStreamBuffer>>({});
  const [blocks, setBlocks] = useState<Record<string, MarkdownBlock[]>>({});

  useEffect(() => {
    ptyClient.scanAgents().then((list) => {
      setAgents(list);
    });
    loadSavedSessions();
  }, []);

  const loadSavedSessions = () => {
    ptyClient.getSavedSessions().then((list) => {
      setSavedSessions(list);
    });
  };

  const handleSelectFont = (opt: FontOption) => {
    setSelectedFont(opt);
    document.body.style.fontFamily = opt.proseFont;
  };

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

  const handleRestoreSession = (session: SavedSession) => {
    const existingTab = tabs.find((t) => t.id === session.id);
    if (existingTab) {
      setActiveTabId(session.id);
      setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === session.id })));
    } else {
      const newTab: SessionTab = {
        id: session.id,
        title: session.title,
        agentId: session.agentId,
        cwd: session.cwd,
        status: 'idle',
        active: true,
      };

      const buf = new BlockStreamBuffer();
      const initialBlocks = buf.append(session.rawText);

      setBuffers((prev) => ({ ...prev, [session.id]: buf }));
      setBlocks((prev) => ({ ...prev, [session.id]: [...initialBlocks] }));
      setTabs((prev) => [...prev.map((t) => ({ ...t, active: false })), newTab]);
      setActiveTabId(session.id);
    }

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

      // Auto-save session periodically
      const tab = tabs.find((t) => t.id === sessionId);
      if (tab) {
        ptyClient.saveSession({
          id: sessionId,
          title: tab.title,
          agentId: tab.agentId,
          agentName: tab.title.split(' (')[0],
          cwd: tab.cwd,
          rawText: buf.getText(),
          timestamp: Date.now(),
        });
      }
    }
  };

  const handleSendPrompt = (text: string) => {
    if (!activeTabId) return;
    ptyClient.writePty(activeTabId, `${text}\n`);

    const buf = buffers[activeTabId];
    if (buf) {
      const updatedBlocks = buf.appendUserPrompt(text);
      setBlocks((prev) => ({
        ...prev,
        [activeTabId]: [...updatedBlocks],
      }));
    }
  };

  const handleInterrupt = () => {
    if (!activeTabId) return;
    ptyClient.writePty(activeTabId, '\x03');
  };

  const handleExportCurrentMarkdown = () => {
    const buf = buffers[activeTabId];
    const text = buf ? buf.getText() : '';
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${activeTabId.slice(-6)}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
  const currentHeadings = (blocks[activeTabId] || []).filter((b) => b.type === 'heading');

  return (
    <div className="h-screen w-screen flex bg-[#000000] text-[#f4f4f5] overflow-hidden select-none">
      {/* Font Comparison Modal */}
      <FontTestModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        selectedFontKey={selectedFont.key}
        onSelectFont={handleSelectFont}
      />

      {/* Collapsible Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          if (v === 'agents') {
            setIsLaunching(false);
          } else if (v === 'history') {
            loadSavedSessions();
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeView === 'agents' ? (
            isLaunching && selectedAgent ? (
              <WorkspaceLauncher
                key="launcher"
                agent={selectedAgent}
                onLaunch={handleLaunchSession}
                onBack={() => setIsLaunching(false)}
              />
            ) : (
              <motion.div
                key="hub"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Top Banner with Blind Font Test trigger */}
                <div className="flex justify-end p-4">
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setIsFontModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass-panel hover:border-white/[0.25] text-xs text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles size={12} className="text-zinc-400" />
                    <span>Compare Typography ({selectedFont.label})</span>
                  </motion.button>
                </div>

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
              </motion.div>
            )
          ) : activeView === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <HistoryDrawer
                sessions={savedSessions}
                onSelectSession={handleRestoreSession}
                onClose={() => setActiveView('workspace')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-4 text-zinc-500 p-8 text-center"
                >
                  <div className="p-4 rounded-2xl glass-panel border border-white/[0.08] text-white">
                    <MessageSquare size={32} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">No Active Agent Sessions</h2>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Launch a new session from the Agent Hub to start interacting with your coding agents.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveView('agents')}
                    className="px-5 py-2.5 bg-white text-black rounded-xl text-xs font-semibold hover:bg-zinc-200 transition-all shadow-md cursor-pointer"
                  >
                    Open Agent Hub
                  </motion.button>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Single Unified Workspace Header */}
                  <div className="flex justify-between items-center px-6 py-2 glass-panel border-b border-white/[0.08] text-xs">
                    {/* Left: Mode Switcher */}
                    <div className="flex items-center space-x-1 bg-[#121215] p-1 rounded-xl border border-white/[0.08]">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setViewMode('chat')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          viewMode === 'chat'
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <MessageSquare size={13} />
                        <span>Chat</span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setViewMode('document')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          viewMode === 'document'
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <FileText size={13} />
                        <span>Document</span>
                      </motion.button>
                    </div>

                    {/* Right: Font Test, TOC, Export & Terminal Controls */}
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setIsFontModalOpen(true)}
                        className="btn-tactile flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-all duration-150 cursor-pointer"
                        title="Blind Font Test"
                      >
                        <Sparkles size={12} className="text-zinc-400" />
                        <span>Font ({selectedFont.label})</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowToc(!showToc)}
                        className={`btn-tactile flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                          showToc
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        <ListCollapse size={13} />
                        <span>TOC ({currentHeadings.length})</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleExportCurrentMarkdown}
                        className="btn-tactile flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-all duration-150 cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Export .MD</span>
                      </motion.button>

                      <div className="h-4 w-px bg-white/[0.1] mx-1" />

                      <div className="flex items-center space-x-1 glass-panel p-1 rounded-xl border border-white/[0.08]">
                        <span className="text-[11px] text-zinc-500 px-1.5 font-medium">Terminal:</span>
                        {(
                          [
                            { pos: 'bottom', title: 'Dock Bottom', icon: <PanelBottom size={13} /> },
                            { pos: 'left', title: 'Dock Left', icon: <PanelLeft size={13} /> },
                            { pos: 'right', title: 'Dock Right', icon: <PanelRight size={13} /> },
                            { pos: 'float', title: 'Floating Window', icon: <Maximize2 size={13} /> },
                            { pos: 'hidden', title: 'Hide Terminal', icon: <EyeOff size={13} /> },
                          ] as const
                        ).map(({ pos, title, icon }) => (
                          <motion.button
                            key={pos}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setDockPosition(pos)}
                            title={title}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              dockPosition === pos ? 'bg-white text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {icon}
                          </motion.button>
                        ))}
                      </div>
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
                      showToc={showToc}
                      onToggleToc={() => setShowToc(!showToc)}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
