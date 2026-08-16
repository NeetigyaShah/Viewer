import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PORT = 3001;
const SESSIONS_DIR = join(homedir(), '.viewer', 'sessions');

if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[PTY ConPTY Server] Running on ws://127.0.0.1:${PORT}`);
console.log(`[Session Store] Sessions directory: ${SESSIONS_DIR}`);

const activeProcesses = new Map();

function scanInstalledAgents() {
  const isWin = process.platform === 'win32';
  const pathDirs = (process.env.PATH || '').split(isWin ? ';' : ':');

  const known = [
    { id: 'omp', name: 'Oh My Pi (OMP)', command: 'omp', isWinCmd: 'omp.cmd', description: "Multi-agent coding harness & tool orchestrator" },
    { id: 'claude', name: 'Claude Code CLI', command: 'claude', isWinCmd: 'claude.cmd', description: "Anthropic's official agentic coding CLI" },
    { id: 'codex', name: 'Codex CLI', command: 'codex', isWinCmd: 'codex.cmd', description: "OpenAI Codex CLI coding assistant" },
    { id: 'hermes', name: 'Hermes Agent', command: 'hermes', isWinCmd: 'hermes.cmd', description: "Autonomous terminal coding agent" },
    { id: 'aider', name: 'Aider', command: 'aider', isWinCmd: 'aider.exe', description: "AI pair programming in your terminal" },
    { id: 'powershell', name: 'PowerShell', command: 'powershell.exe', isWinCmd: 'powershell.exe', description: "Windows PowerShell terminal shell" },
    { id: 'bash', name: 'Bash / Git Bash', command: 'bash.exe', isWinCmd: 'bash.exe', description: "Unix Bash shell / WSL environment" }
  ];

  return known.map(agent => {
    let resolvedPath = null;
    const targetBinary = isWin ? agent.isWinCmd : agent.command;

    for (const dir of pathDirs) {
      const full = join(dir, targetBinary);
      if (existsSync(full)) {
        resolvedPath = full;
        break;
      }
    }

    return {
      id: agent.id,
      name: agent.name,
      command: agent.command,
      binary: resolvedPath || (isWin ? agent.isWinCmd : agent.command),
      path: resolvedPath,
      is_installed: !!resolvedPath,
      description: agent.description
    };
  });
}

function listSavedSessions() {
  try {
    const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const content = readFileSync(join(SESSIONS_DIR, file), 'utf-8');
      return JSON.parse(content);
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch {
    return [];
  }
}

wss.on('connection', (ws) => {
  console.log('[PTY ConPTY Bridge] Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, sessionId, payload } = data;

      if (type === 'SCAN_AGENTS') {
        const agents = scanInstalledAgents();
        ws.send(JSON.stringify({ type: 'AGENTS_SCANNED', payload: agents }));
        return;
      }

      if (type === 'GET_SESSIONS') {
        const sessions = listSavedSessions();
        ws.send(JSON.stringify({ type: 'SESSIONS_LOADED', payload: sessions }));
        return;
      }

      if (type === 'SAVE_SESSION') {
        const { id } = payload;
        const filePath = join(SESSIONS_DIR, `${id}.json`);
        writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        return;
      }

      if (type === 'SPAWN_PTY') {
        const { command, args = [], cwd = process.cwd(), cols = 120, rows = 32 } = payload;
        console.log(`[ConPTY Spawn] Session ${sessionId}: ${command} in ${cwd} (${cols}x${rows})`);

        const isWin = process.platform === 'win32';
        let shellExecutable = command;
        let shellArgs = args;

        // On Windows, resolve .cmd / shell wrappers properly with ConPTY
        if (isWin) {
          if (command === 'powershell' || command === 'powershell.exe') {
            shellExecutable = 'powershell.exe';
            shellArgs = ['-NoLogo'];
          } else if (command === 'cmd' || command === 'cmd.exe') {
            shellExecutable = 'cmd.exe';
            shellArgs = [];
          } else if (command === 'bash' || command === 'bash.exe') {
            shellExecutable = 'bash.exe';
            shellArgs = [];
          } else {
            // For OMP, Claude, Codex, run inside cmd.exe /c with ConPTY
            shellExecutable = 'cmd.exe';
            shellArgs = ['/c', command, ...args];
          }
        }

        const ptyProcess = pty.spawn(shellExecutable, shellArgs, {
          name: 'xterm-256color',
          cols: cols || 120,
          rows: rows || 32,
          cwd: cwd || process.cwd(),
          env: {
            ...process.env,
            FORCE_COLOR: '3',
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          },
        });

        activeProcesses.set(sessionId, ptyProcess);

        ptyProcess.onData((chunk) => {
          ws.send(JSON.stringify({
            type: 'PTY_OUTPUT',
            sessionId,
            payload: chunk,
          }));
        });

        ptyProcess.onExit(({ exitCode }) => {
          console.log(`[ConPTY Exit] Session ${sessionId} exited with code ${exitCode}`);
          activeProcesses.delete(sessionId);
          ws.send(JSON.stringify({
            type: 'PTY_EXIT',
            sessionId,
            payload: { exitCode },
          }));
        });

        return;
      }

      if (type === 'WRITE_PTY') {
        const ptyProcess = activeProcesses.get(sessionId);
        if (ptyProcess) {
          ptyProcess.write(payload);
        }
        return;
      }

      if (type === 'RESIZE_PTY') {
        const ptyProcess = activeProcesses.get(sessionId);
        const { cols, rows } = payload || {};
        if (ptyProcess && cols && rows) {
          try {
            ptyProcess.resize(cols, rows);
          } catch {
            // ignore resize error on closed process
          }
        }
        return;
      }

      if (type === 'KILL_PTY') {
        const ptyProcess = activeProcesses.get(sessionId);
        if (ptyProcess) {
          ptyProcess.kill();
          activeProcesses.delete(sessionId);
        }
        return;
      }
    } catch (err) {
      console.error('[PTY ConPTY Bridge Error]', err);
    }
  });

  ws.on('close', () => {
    console.log('[PTY ConPTY Bridge] Client disconnected');
  });
});
