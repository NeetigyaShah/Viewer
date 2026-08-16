import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PORT = 3001;
const SESSIONS_DIR = join(homedir(), '.viewer', 'sessions');

if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[PTY Bridge Server] Running on ws://127.0.0.1:${PORT}`);
console.log(`[Session Store] Sessions directory: ${SESSIONS_DIR}`);

const activeProcesses = new Map();

function scanInstalledAgents() {
  const isWin = process.platform === 'win32';
  const pathDirs = (process.env.PATH || '').split(isWin ? ';' : ':');

  const known = [
    { id: 'claude', name: 'Claude Code CLI', command: isWin ? 'claude.cmd' : 'claude', fallback: 'claude', description: "Anthropic's official agentic coding CLI" },
    { id: 'codex', name: 'Codex CLI', command: isWin ? 'codex.cmd' : 'codex', fallback: 'codex', description: "OpenAI Codex CLI coding assistant" },
    { id: 'omp', name: 'Oh My Pi (OMP)', command: isWin ? 'omp.cmd' : 'omp', fallback: 'omp', description: "Multi-agent coding harness & tool orchestrator" },
    { id: 'hermes', name: 'Hermes Agent', command: isWin ? 'hermes.cmd' : 'hermes', fallback: 'hermes', description: "Autonomous terminal coding agent" },
    { id: 'aider', name: 'Aider', command: isWin ? 'aider.exe' : 'aider', fallback: 'aider', description: "AI pair programming in your terminal" },
    { id: 'powershell', name: 'PowerShell', command: 'powershell.exe', fallback: 'powershell.exe', description: "Windows PowerShell terminal shell" },
    { id: 'bash', name: 'Bash / Git Bash', command: isWin ? 'bash.exe' : 'bash', fallback: 'bash', description: "Unix Bash shell / WSL environment" }
  ];

  return known.map(agent => {
    let resolvedPath = null;
    for (const dir of pathDirs) {
      const full = join(dir, agent.command);
      if (existsSync(full)) {
        resolvedPath = full;
        break;
      }
    }
    return {
      id: agent.id,
      name: agent.name,
      command: resolvedPath ? agent.command : agent.fallback,
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
  console.log('[PTY Bridge] Client connected');

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
        const { id, title, agentId, cwd, rawText, timestamp } = payload;
        const filePath = join(SESSIONS_DIR, `${id}.json`);
        writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        return;
      }

      if (type === 'SPAWN_PTY') {
        const { command, args = [], cwd = process.cwd() } = payload;
        console.log(`[PTY Spawn] Session ${sessionId}: ${command} in ${cwd}`);

        const child = spawn(command, args, {
          cwd,
          shell: true,
          env: { ...process.env, FORCE_COLOR: '3', TERM: 'xterm-256color' }
        });

        activeProcesses.set(sessionId, child);

        child.stdout.on('data', (chunk) => {
          ws.send(JSON.stringify({
            type: 'PTY_OUTPUT',
            sessionId,
            payload: chunk.toString('utf-8')
          }));
        });

        child.stderr.on('data', (chunk) => {
          ws.send(JSON.stringify({
            type: 'PTY_OUTPUT',
            sessionId,
            payload: chunk.toString('utf-8')
          }));
        });

        child.on('close', (code) => {
          console.log(`[PTY Exit] Session ${sessionId} exited with code ${code}`);
          activeProcesses.delete(sessionId);
          ws.send(JSON.stringify({
            type: 'PTY_EXIT',
            sessionId,
            payload: { exitCode: code }
          }));
        });

        return;
      }

      if (type === 'WRITE_PTY') {
        const child = activeProcesses.get(sessionId);
        if (child && child.stdin) {
          child.stdin.write(payload);
        }
        return;
      }

      if (type === 'KILL_PTY') {
        const child = activeProcesses.get(sessionId);
        if (child) {
          child.kill();
          activeProcesses.delete(sessionId);
        }
        return;
      }
    } catch (err) {
      console.error('[PTY Bridge Error]', err);
    }
  });

  ws.on('close', () => {
    console.log('[PTY Bridge] Client disconnected');
  });
});
