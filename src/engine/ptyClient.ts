import { AgentInfo, SavedSession } from './types';

type OutputListener = (data: string) => void;
type ExitListener = (exitCode: number) => void;

class PtyClient {
  private ws: WebSocket | null = null;
  private isTauri: boolean = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  private outputListeners: Map<string, Set<OutputListener>> = new Map();
  private exitListeners: Map<string, Set<ExitListener>> = new Map();
  private pendingSpawns: Map<string, { command: string; args: string[]; cwd: string }> = new Map();
  private isConnected: boolean = false;
  private agentScanResolver: ((agents: AgentInfo[]) => void) | null = null;
  private sessionsResolver: ((sessions: SavedSession[]) => void) | null = null;

  constructor() {
    if (!this.isTauri) {
      this.connectWebSocket();
    }
  }

  private connectWebSocket() {
    try {
      this.ws = new WebSocket('ws://127.0.0.1:3001');

      this.ws.onopen = () => {
        this.isConnected = true;
        for (const [sessionId, info] of this.pendingSpawns.entries()) {
          this.ws?.send(
            JSON.stringify({
              type: 'SPAWN_PTY',
              sessionId,
              payload: info,
            })
          );
        }
        this.pendingSpawns.clear();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'AGENTS_SCANNED' && this.agentScanResolver) {
            this.agentScanResolver(msg.payload as AgentInfo[]);
            this.agentScanResolver = null;
          } else if (msg.type === 'SESSIONS_LOADED' && this.sessionsResolver) {
            this.sessionsResolver(msg.payload as SavedSession[]);
            this.sessionsResolver = null;
          } else if (msg.type === 'PTY_OUTPUT') {
            const listeners = this.outputListeners.get(msg.sessionId);
            if (listeners) {
              for (const cb of listeners) cb(msg.payload);
            }
          } else if (msg.type === 'PTY_EXIT') {
            const listeners = this.exitListeners.get(msg.sessionId);
            if (listeners) {
              for (const cb of listeners) cb(msg.payload.exitCode);
            }
          }
        } catch {
          // ignore malformed message
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this.connectWebSocket(), 2000);
      };
    } catch {
      // WS error fallback
    }
  }

  async scanAgents(): Promise<AgentInfo[]> {
    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<AgentInfo[]>('scan_agents');
      } catch {
        return [];
      }
    }

    return new Promise((resolve) => {
      this.agentScanResolver = resolve;
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ type: 'SCAN_AGENTS' }));
      } else {
        setTimeout(() => {
          resolve([
            { id: 'claude', name: 'Claude Code CLI', command: 'claude', is_installed: true, description: "Anthropic's official agentic coding assistant" },
            { id: 'codex', name: 'Codex CLI', command: 'codex', is_installed: true, description: "OpenAI Codex CLI coding assistant" },
            { id: 'omp', name: 'Oh My Pi (OMP)', command: 'omp', is_installed: true, description: "Multi-agent coding harness & tool orchestrator" },
            { id: 'hermes', name: 'Hermes Agent', command: 'hermes', is_installed: true, description: "Autonomous terminal coding agent" },
            { id: 'powershell', name: 'PowerShell', command: 'powershell.exe', is_installed: true, description: "Windows PowerShell terminal shell" },
          ]);
        }, 300);
      }
    });
  }

  async getSavedSessions(): Promise<SavedSession[]> {
    return new Promise((resolve) => {
      this.sessionsResolver = resolve;
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ type: 'GET_SESSIONS' }));
      } else {
        setTimeout(() => resolve([]), 300);
      }
    });
  }

  saveSession(session: SavedSession): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'SAVE_SESSION', payload: session }));
    }
  }

  async spawnPty(sessionId: string, command: string, args: string[] = [], cwd: string = ''): Promise<void> {
    if (this.isTauri) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('pty_spawn', {
        sessionId,
        command,
        args,
        cwd: cwd || null,
        cols: 120,
        rows: 32,
      });
      return;
    }

    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'SPAWN_PTY',
          sessionId,
          payload: { command, args, cwd },
        })
      );
    } else {
      this.pendingSpawns.set(sessionId, { command, args, cwd });
    }
  }

  writePty(sessionId: string, data: string): void {
    if (this.isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_write', { sessionId, data }).catch(() => {});
      });
      return;
    }

    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'WRITE_PTY',
          sessionId,
          payload: data,
        })
      );
    }
  }

  resizePty(sessionId: string, cols: number, rows: number): void {
    if (this.isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_resize', { sessionId, cols, rows }).catch(() => {});
      });
      return;
    }

    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'RESIZE_PTY',
          sessionId,
          payload: { cols, rows },
        })
      );
    }
  }

  killPty(sessionId: string): void {
    if (this.isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_kill', { sessionId }).catch(() => {});
      });
      return;
    }

    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: 'KILL_PTY',
          sessionId,
        })
      );
    }
  }

  onOutput(sessionId: string, cb: OutputListener): () => void {
    if (!this.outputListeners.has(sessionId)) {
      this.outputListeners.set(sessionId, new Set());
    }
    this.outputListeners.get(sessionId)?.add(cb);

    if (this.isTauri) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>(`pty_output:${sessionId}`, (e) => cb(e.payload));
      });
    }

    return () => {
      this.outputListeners.get(sessionId)?.delete(cb);
    };
  }

  onExit(sessionId: string, cb: ExitListener): () => void {
    if (!this.exitListeners.has(sessionId)) {
      this.exitListeners.set(sessionId, new Set());
    }
    this.exitListeners.get(sessionId)?.add(cb);

    return () => {
      this.exitListeners.get(sessionId)?.delete(cb);
    };
  }
}

export const ptyClient = new PtyClient();
