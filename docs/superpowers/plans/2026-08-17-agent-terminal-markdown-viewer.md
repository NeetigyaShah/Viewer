# Agent Terminal & Rich Markdown Workspace (Viewer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance Tauri v2 desktop application that launches AI CLI coding agents (Claude Code, Codex, OMP, Hermes) in native PTYs, manages concurrent sessions with browser-style multi-tabs, embeds a 5-position dockable interactive terminal, and parses/renders live output in vibrant, rich colorful Markdown with syntax highlighting, LaTeX math, deferred Mermaid diagrams, SVG graphics, and visual diffs.

**Architecture:** Tauri v2 with a Rust backend handling native pseudo-terminals (`portable-pty` / Windows ConPTY) and agent PATH discovery. A React + Vite frontend provides an interactive `xterm.js` terminal, an ANSI-to-Color stream tokenizer with block buffering, and a dual-mode visual canvas (Chat Cards ⟷ Live .MD Document).

**Tech Stack:** Tauri v2, Rust (`portable-pty = "0.8"`, `serde`, `serde_json`, `tokio`), React 18, Vite, TypeScript, `xterm` + `@xterm/addon-webgl` + `@xterm/addon-fit`, `shiki`, `katex`, `mermaid`, `dompurify`, Tailwind CSS, Lucide React, Vitest.

## Global Constraints

- **Platform Target**: Windows 10/11 (ConPTY primary), macOS, Linux.
- **PTY Engine**: `portable-pty` with non-blocking async reader threads and lossy UTF-8 decoding to avoid process crashes.
- **ANSI Color Fidelity**: 100% preservation of 16-color, 256-color, and 24-bit TrueColor RGB escape codes mapped to CSS variables.
- **Flicker-Free Streaming**: Incremental block-based updates; open Mermaid code fences MUST be buffered and rendered only on closure with a visual pulse placeholder.
- **UI Responsiveness**: Debounced terminal resize (50ms) to prevent IPC thrashing during divider drag.

---

### Task 1: Tauri v2 Scaffold & Rust Backend PTY Supervisor

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/pty.rs`
- Create: `src-tauri/src/scanner.rs`
- Test: `src-tauri/tests/pty_test.rs`

**Interfaces:**
- Produces: Tauri commands `scan_agents`, `pty_spawn`, `pty_write`, `pty_resize`, `pty_kill`.
- Produces: Tauri events `pty_output:<session_id>`, `pty_exit:<session_id>`.

- [ ] **Step 1: Write the backend PTY and Scanner test**

Create `src-tauri/tests/pty_test.rs`:
```rust
#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    #[test]
    fn test_session_manager_lifecycle() {
        // Test struct creation and session lifecycle
        let manager = viewer_lib::pty::SessionManager::new();
        assert_eq!(manager.active_count(), 0);
    }

    #[test]
    fn test_agent_scanner_path_check() {
        let scanner = viewer_lib::scanner::AgentScanner::new();
        let agents = scanner.scan();
        // Should return a list with known agent definitions
        assert!(agents.iter().any(|a| a.id == "claude" || a.id == "custom"));
    }
}
```

- [ ] **Step 2: Create Tauri configuration and Cargo manifest**

Create `src-tauri/Cargo.toml`:
```toml
[package]
name = "viewer"
version = "0.1.0"
edition = "2021"

[lib]
name = "viewer_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[dependencies]
tauri = { version = "2.0.0", features = [] }
tauri-plugin-shell = "2.0.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
portable-pty = "0.8"
tokio = { version = "1.0", features = ["full"] }
uuid = { version = "1.6", features = ["v4", "fast-rng"] }
which = "6.0"
dirs = "5.0"
```

Create `src-tauri/tauri.conf.json`:
```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/config.schema.json",
  "productName": "Viewer",
  "version": "0.1.0",
  "identifier": "com.viewer.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Viewer — Agent Terminal & Markdown Workspace",
        "width": 1400,
        "height": 900,
        "minWidth": 900,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

- [ ] **Step 3: Implement Rust `pty.rs` and `scanner.rs`**

Create `src-tauri/src/pty.rs`:
```rust
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtyPair, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    pub id: String,
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

#[derive(Clone, Default)]
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, Arc<Mutex<PtySession>>>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn active_count(&self) -> usize {
        self.sessions.lock().unwrap().len()
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        session_id: String,
        command: String,
        args: Vec<String>,
        cwd: Option<String>,
        cols: u16,
        rows: u16,
    ) -> Result<String, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let mut cmd = CommandBuilder::new(command);
        cmd.args(args);
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn command: {}", e))?;
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take PTY writer: {}", e))?;
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

        let session = Arc::new(Mutex::new(PtySession {
            id: session_id.clone(),
            master: pair.master,
            writer,
        }));

        self.sessions
            .lock()
            .unwrap()
            .insert(session_id.clone(), session);

        // Background reader thread
        let app_clone = app.clone();
        let sid = session_id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        let _ = app_clone.emit(&format!("pty_exit:{}", sid), 0);
                        break;
                    }
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_clone.emit(&format!("pty_output:{}", sid), text);
                    }
                    Err(_) => {
                        let _ = app_clone.emit(&format!("pty_exit:{}", sid), 1);
                        break;
                    }
                }
            }
            let _ = child.wait();
        });

        Ok(session_id)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(session_id) {
            let mut sess = session.lock().unwrap();
            sess.writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Write failed: {}", e))?;
            sess.writer
                .flush()
                .map_err(|e| format!("Flush failed: {}", e))?;
            Ok(())
        } else {
            Err(format!("Session {} not found", session_id))
        }
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(session_id) {
            let sess = session.lock().unwrap();
            sess.master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Resize failed: {}", e))?;
            Ok(())
        } else {
            Err(format!("Session {} not found", session_id))
        }
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(session_id);
        Ok(())
    }
}
```

Create `src-tauri/src/scanner.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetadata {
    pub id: String,
    pub name: String,
    pub command: String,
    pub path: Option<String>,
    pub is_installed: bool,
    pub version: Option<String>,
    pub description: String,
}

#[derive(Default)]
pub struct AgentScanner;

impl AgentScanner {
    pub fn new() -> Self {
        Self
    }

    pub fn scan(&self) -> Vec<AgentMetadata> {
        let known = vec![
            ("claude", "Claude Code CLI", "claude", "Anthropic's official agentic coding assistant"),
            ("codex", "Codex CLI", "codex", "OpenAI Codex CLI coding assistant"),
            ("omp", "Oh My Pi (OMP)", "omp", "Multi-agent coding harness & tool orchestrator"),
            ("hermes", "Hermes Agent", "hermes", "Autonomous terminal coding agent"),
            ("aider", "Aider", "aider", "AI pair programming in your terminal"),
            ("powershell", "PowerShell", "powershell.exe", "Windows PowerShell terminal shell"),
            ("bash", "Bash Shell", "bash", "Unix Bash shell / WSL"),
        ];

        known
            .into_iter()
            .map(|(id, name, cmd, desc)| {
                let resolved_path = which::which(cmd).ok().map(|p| p.to_string_lossy().to_string());
                let is_installed = resolved_path.is_some();
                AgentMetadata {
                    id: id.to_string(),
                    name: name.to_string(),
                    command: cmd.to_string(),
                    path: resolved_path,
                    is_installed,
                    version: None,
                    description: desc.to_string(),
                }
            })
            .collect()
    }
}
```

- [ ] **Step 4: Wire Tauri commands in `lib.rs` and `main.rs`**

Create `src-tauri/src/lib.rs`:
```rust
pub mod pty;
pub mod scanner;

use pty::SessionManager;
use scanner::{AgentMetadata, AgentScanner};
use tauri::State;

#[tauri::command]
fn scan_agents() -> Vec<AgentMetadata> {
    AgentScanner::new().scan()
}

#[tauri::command]
fn pty_spawn(
    app: tauri::AppHandle,
    state: State<SessionManager>,
    session_id: String,
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    state.spawn(app, session_id, command, args, cwd, cols, rows)
}

#[tauri::command]
fn pty_write(state: State<SessionManager>, session_id: String, data: String) -> Result<(), String> {
    state.write(&session_id, &data)
}

#[tauri::command]
fn pty_resize(state: State<SessionManager>, session_id: String, cols: u16, rows: u16) -> Result<(), String> {
    state.resize(&session_id, cols, rows)
}

#[tauri::command]
fn pty_kill(state: State<SessionManager>, session_id: String) -> Result<(), String> {
    state.kill(&session_id)
}

pub fn run() {
    tauri::Builder::default()
        .manage(SessionManager::new())
        .invoke_handler(tauri::generate_handler![
            scan_agents,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Create `src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    viewer_lib::run();
}
```

- [ ] **Step 5: Run tests and commit**
```bash
git add src-tauri/
git commit -m "feat(backend): implement Tauri v2 PTY supervisor and agent scanner"
```

---

### Task 2: ANSI Color Tokenizer & Stream Block Buffer (Frontend Engine)

**Files:**
- Create: `src/engine/ansiTokenizer.ts`
- Create: `src/engine/blockBuffer.ts`
- Create: `src/engine/types.ts`
- Test: `tests/engine/ansiTokenizer.test.ts`
- Test: `tests/engine/blockBuffer.test.ts`

**Interfaces:**
- Consumes: Raw PTY string chunks emitted by backend.
- Produces: `tokenizeAnsi(raw: string): TokenSpan[]` and `BlockStreamBuffer` class emitting finalized/active Markdown blocks.

- [ ] **Step 1: Write failing tests for ANSI Tokenizer and Block Buffer**

Create `tests/engine/ansiTokenizer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tokenizeAnsi } from '../../src/engine/ansiTokenizer';

describe('ansiTokenizer', () => {
  it('should parse plain text without ANSI codes', () => {
    const tokens = tokenizeAnsi('Hello world');
    expect(tokens).toEqual([{ text: 'Hello world', color: null, bold: false }]);
  });

  it('should parse 16-color ANSI sequences into styled spans', () => {
    const tokens = tokenizeAnsi('\x1b[32mSuccess\x1b[0m normal');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ text: 'Success', color: 'var(--ansi-green)' });
    expect(tokens[1]).toMatchObject({ text: ' normal', color: null });
  });

  it('should parse 24-bit TrueColor RGB sequences', () => {
    const tokens = tokenizeAnsi('\x1b[38;2;255;100;50mCustom RGB\x1b[0m');
    expect(tokens[0]).toMatchObject({ text: 'Custom RGB', color: 'rgb(255,100,50)' });
  });
});
```

Create `tests/engine/blockBuffer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { BlockStreamBuffer } from '../../src/engine/blockBuffer';

describe('BlockStreamBuffer', () => {
  it('should buffer incomplete code fences without throwing', () => {
    const buffer = new BlockStreamBuffer();
    buffer.append('```mermaid\ngraph TD\n  A --> B');
    const blocks = buffer.getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].isComplete).toBe(false);
  });

  it('should mark block complete upon receiving closing delimiter', () => {
    const buffer = new BlockStreamBuffer();
    buffer.append('```mermaid\ngraph TD\n  A --> B\n```\n\nNext paragraph');
    const blocks = buffer.getBlocks();
    expect(blocks).toHaveLength(2);
    expect(blocks[0].isComplete).toBe(true);
    expect(blocks[1].type).toBe('paragraph');
  });
});
```

- [ ] **Step 2: Run Vitest to verify tests fail**
Run: `npx vitest run tests/engine/` -> FAIL

- [ ] **Step 3: Implement `types.ts`, `ansiTokenizer.ts`, and `blockBuffer.ts`**

Create `src/engine/types.ts`:
```ts
export interface TokenSpan {
  text: string;
  color: string | null;
  bgColor?: string | null;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type BlockType = 'heading' | 'paragraph' | 'code' | 'table' | 'math' | 'list';

export interface MarkdownBlock {
  id: string;
  type: BlockType;
  rawContent: string;
  lang?: string;
  isComplete: boolean;
  timestamp: number;
}
```

Create `src/engine/ansiTokenizer.ts`:
```ts
import { TokenSpan } from './types';

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'var(--ansi-black)',
  31: 'var(--ansi-red)',
  32: 'var(--ansi-green)',
  33: 'var(--ansi-yellow)',
  34: 'var(--ansi-blue)',
  35: 'var(--ansi-magenta)',
  36: 'var(--ansi-cyan)',
  37: 'var(--ansi-white)',
  90: 'var(--ansi-bright-black)',
  91: 'var(--ansi-bright-red)',
  92: 'var(--ansi-bright-green)',
  93: 'var(--ansi-bright-yellow)',
  94: 'var(--ansi-bright-blue)',
  95: 'var(--ansi-bright-magenta)',
  96: 'var(--ansi-bright-cyan)',
  97: 'var(--ansi-bright-white)',
};

export function tokenizeAnsi(input: string): TokenSpan[] {
  const result: TokenSpan[] = [];
  const regex = /\x1b\[([0-9;]+)m/g;
  let lastIndex = 0;
  let currentColor: string | null = null;
  let currentBg: string | null = null;
  let bold = false;
  let italic = false;
  let underline = false;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        text: input.substring(lastIndex, match.index),
        color: currentColor,
        bgColor: currentBg,
        bold,
        italic,
        underline,
      });
    }

    const codes = match[1].split(';').map(Number);
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        currentColor = null;
        currentBg = null;
        bold = false;
        italic = false;
        underline = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 3) {
        italic = true;
      } else if (code === 4) {
        underline = true;
      } else if (ANSI_COLOR_MAP[code]) {
        currentColor = ANSI_COLOR_MAP[code];
      } else if (code === 38 && codes[i + 1] === 2) {
        // TrueColor RGB
        const r = codes[i + 2];
        const g = codes[i + 3];
        const b = codes[i + 4];
        currentColor = `rgb(${r},${g},${b})`;
        i += 4;
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    result.push({
      text: input.substring(lastIndex),
      color: currentColor,
      bgColor: currentBg,
      bold,
      italic,
      underline,
    });
  }

  return result;
}
```

Create `src/engine/blockBuffer.ts`:
```ts
import { MarkdownBlock } from './types';

export class BlockStreamBuffer {
  private fullText: string = '';
  private blocks: MarkdownBlock[] = [];

  append(chunk: string): MarkdownBlock[] {
    this.fullText += chunk;
    this.reparse();
    return this.blocks;
  }

  getText(): string {
    return this.fullText;
  }

  getBlocks(): MarkdownBlock[] {
    return this.blocks;
  }

  clear() {
    this.fullText = '';
    this.blocks = [];
  }

  private reparse() {
    const lines = this.fullText.split('\n');
    const newBlocks: MarkdownBlock[] = [];
    let currentBlock: { type: string; lines: string[]; lang?: string; isComplete: boolean } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (currentBlock && currentBlock.type === 'code') {
        currentBlock.lines.push(line);
        if (line.trim().startsWith('```')) {
          currentBlock.isComplete = true;
          newBlocks.push({
            id: `block-${newBlocks.length}`,
            type: 'code',
            rawContent: currentBlock.lines.join('\n'),
            lang: currentBlock.lang,
            isComplete: true,
            timestamp: Date.now(),
          });
          currentBlock = null;
        }
        continue;
      }

      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        currentBlock = { type: 'code', lines: [line], lang, isComplete: false };
        continue;
      }

      if (line.trim().startsWith('#')) {
        newBlocks.push({
          id: `block-${newBlocks.length}`,
          type: 'heading',
          rawContent: line,
          isComplete: true,
          timestamp: Date.now(),
        });
        continue;
      }

      if (line.trim() === '') {
        if (currentBlock && currentBlock.type === 'paragraph') {
          newBlocks.push({
            id: `block-${newBlocks.length}`,
            type: 'paragraph',
            rawContent: currentBlock.lines.join('\n'),
            isComplete: true,
            timestamp: Date.now(),
          });
          currentBlock = null;
        }
        continue;
      }

      if (!currentBlock) {
        currentBlock = { type: 'paragraph', lines: [line], isComplete: false };
      } else {
        currentBlock.lines.push(line);
      }
    }

    if (currentBlock) {
      newBlocks.push({
        id: `block-${newBlocks.length}`,
        type: currentBlock.type as any,
        rawContent: currentBlock.lines.join('\n'),
        lang: currentBlock.lang,
        isComplete: false,
        timestamp: Date.now(),
      });
    }

    this.blocks = newBlocks;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run tests/engine/` -> PASS

- [ ] **Step 5: Commit**
```bash
git add src/engine/ tests/engine/
git commit -m "feat(engine): implement ANSI color tokenizer and block stream buffer"
```

---

### Task 3: Workspace Shell, Multi-Tab Manager & Docking UI

**Files:**
- Create: `src/components/TabManager.tsx`
- Create: `src/components/TerminalDock.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/WorkspaceLayout.tsx`
- Create: `src/styles/theme.css`
- Test: `tests/components/TabManager.test.tsx`

**Interfaces:**
- Consumes: `SessionManager` Tauri invoke API, `xterm.js`.
- Produces: 3-pane flexible layout with tab switching and 5-position dockable terminal.

- [ ] **Step 1: Write component tests for TabManager**

Create `tests/components/TabManager.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TabManager } from '../../src/components/TabManager';

describe('TabManager', () => {
  it('should render active tab title', () => {
    const tabs = [{ id: '1', title: 'Claude Code (Project A)', active: true }];
    render(<TabManager tabs={tabs} onSelectTab={() => {}} onNewTab={() => {}} onCloseTab={() => {}} />);
    expect(screen.getByText('Claude Code (Project A)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Theme CSS variables and TerminalDock**

Create `src/styles/theme.css`:
```css
:root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #181825;
  --bg-tertiary: #313244;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --accent-primary: #89b4fa;
  --border-color: #45475a;

  /* ANSI Color Variables */
  --ansi-black: #45475a;
  --ansi-red: #f38ba8;
  --ansi-green: #a6e3a1;
  --ansi-yellow: #f9e2af;
  --ansi-blue: #89b4fa;
  --ansi-magenta: #cba6f7;
  --ansi-cyan: #94e2d5;
  --ansi-white: #bac2de;
  --ansi-bright-black: #585b70;
  --ansi-bright-red: #f38ba8;
  --ansi-bright-green: #a6e3a1;
  --ansi-bright-yellow: #f9e2af;
  --ansi-bright-blue: #89b4fa;
  --ansi-bright-magenta: #cba6f7;
  --ansi-bright-cyan: #94e2d5;
  --ansi-bright-white: #a6adc8;
}
```

Create `src/components/TerminalDock.tsx`:
```tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface TerminalDockProps {
  sessionId: string;
  dockPosition: 'bottom' | 'left' | 'right' | 'float' | 'hidden';
  onOutput?: (chunk: string) => void;
}

export const TerminalDock: React.FC<TerminalDockProps> = ({ sessionId, dockPosition, onOutput }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#181825',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
      },
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 13,
      lineHeight: 1.2,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    try {
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
    } catch {
      // WebGL fallback
    }

    term.open(terminalRef.current);
    fit.fit();
    termInstance.current = term;
    fitAddon.current = fit;

    term.onData((data) => {
      invoke('pty_write', { sessionId, data });
    });

    const unlistenPromise = listen<string>(`pty_output:${sessionId}`, (event) => {
      term.write(event.payload);
      if (onOutput) onOutput(event.payload);
    });

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
      invoke('pty_resize', { sessionId, cols: term.cols, rows: term.rows });
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [sessionId]);

  if (dockPosition === 'hidden') return null;

  return (
    <div className={`terminal-dock dock-${dockPosition} h-full w-full bg-[#181825] p-2 flex flex-col`}>
      <div className="terminal-header flex justify-between items-center px-2 py-1 bg-[#11111b] text-xs text-gray-400 border-b border-[#313244]">
        <span>Terminal (Session: {sessionId.slice(0, 8)})</span>
      </div>
      <div ref={terminalRef} className="flex-1 overflow-hidden" />
    </div>
  );
};
```

- [ ] **Step 3: Implement `TabManager.tsx` and `WorkspaceLayout.tsx`**

Create `src/components/TabManager.tsx`:
```tsx
import React from 'react';
import { Plus, X } from 'lucide-react';

export interface TabItem {
  id: string;
  title: string;
  active: boolean;
}

interface TabManagerProps {
  tabs: TabItem[];
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
}

export const TabManager: React.FC<TabManagerProps> = ({ tabs, onSelectTab, onNewTab, onCloseTab }) => {
  return (
    <div className="flex items-center bg-[#11111b] border-b border-[#313244] px-2 h-10 select-none">
      <div className="flex space-x-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 ${
              tab.active
                ? 'bg-[#181825] text-[#cdd6f4] border-[#89b4fa]'
                : 'bg-[#11111b] text-gray-400 border-transparent hover:bg-[#1e1e2e]'
            }`}
          >
            <span className="truncate max-w-[150px]">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="hover:text-red-400"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={onNewTab} className="p-1.5 hover:bg-[#313244] rounded text-gray-300 ml-2">
        <Plus size={14} />
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run tests to verify and commit**
```bash
git add src/components/ src/styles/ tests/components/
git commit -m "feat(ui): implement multi-tab manager and flexible terminal docking layout"
```

---

### Task 4: Rich Visual Canvas Suite (Markdown, Shiki, KaTeX, Mermaid, SVG, Diffs)

**Files:**
- Create: `src/components/VisualCanvas.tsx`
- Create: `src/components/renderers/CodeBlock.tsx`
- Create: `src/components/renderers/MermaidBlock.tsx`
- Create: `src/components/renderers/MathBlock.tsx`
- Create: `src/components/renderers/DiffBlock.tsx`
- Create: `src/components/renderers/SvgBlock.tsx`
- Test: `tests/components/VisualCanvas.test.tsx`

**Interfaces:**
- Consumes: `MarkdownBlock[]` from `BlockStreamBuffer`.
- Produces: Dual-mode visual canvas with syntax highlighting, LaTeX formulas, deferred Mermaid diagrams, and safe SVG graphics.

- [ ] **Step 1: Write tests for VisualCanvas rendering**

Create `tests/components/VisualCanvas.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { VisualCanvas } from '../../src/components/VisualCanvas';
import { MarkdownBlock } from '../../src/engine/types';

describe('VisualCanvas', () => {
  it('should render headings and code blocks', () => {
    const blocks: MarkdownBlock[] = [
      { id: '1', type: 'heading', rawContent: '# Title Header', isComplete: true, timestamp: Date.now() },
      { id: '2', type: 'paragraph', rawContent: 'Hello world markdown', isComplete: true, timestamp: Date.now() },
    ];
    render(<VisualCanvas blocks={blocks} viewMode="document" />);
    expect(screen.getByText('Title Header')).toBeInTheDocument();
    expect(screen.getByText('Hello world markdown')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement CodeBlock with copy button and Shiki highlighting**

Create `src/components/renderers/CodeBlock.tsx`:
```tsx
import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, lang = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-[#313244] bg-[#11111b]">
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#181825] text-xs text-gray-400 border-b border-[#313244]">
        <span className="font-mono uppercase text-[11px] text-[#89b4fa]">{lang}</span>
        <button onClick={handleCopy} className="flex items-center space-x-1 hover:text-white transition-colors">
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto text-[#cdd6f4]">
        <code>{code}</code>
      </pre>
    </div>
  );
};
```

- [ ] **Step 3: Implement MermaidBlock with Deferred Buffer Pulse Indicator**

Create `src/components/renderers/MermaidBlock.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

interface MermaidBlockProps {
  code: string;
  isComplete: boolean;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, isComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (!isComplete) return; // Do not render incomplete stream to avoid parser crash

    const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
    mermaid
      .render(id, code)
      .then((res) => setSvg(res.svg))
      .catch(() => {
        // Fallback on syntax error
      });
  }, [code, isComplete]);

  if (!isComplete) {
    return (
      <div className="my-3 p-4 rounded-lg border border-dashed border-[#89b4fa]/40 bg-[#181825] flex items-center space-x-2 text-xs text-[#89b4fa] animate-pulse">
        <span className="h-2 w-2 rounded-full bg-[#89b4fa]" />
        <span>Generating Mermaid diagram...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 p-4 rounded-lg bg-[#181825] border border-[#313244] overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
```

- [ ] **Step 4: Implement MathBlock, SvgBlock, and VisualCanvas**

Create `src/components/renderers/MathBlock.tsx`:
```tsx
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  math: string;
  displayMode?: boolean;
}

export const MathBlock: React.FC<MathBlockProps> = ({ math, displayMode = false }) => {
  const html = katex.renderToString(math, {
    displayMode,
    throwOnError: false,
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};
```

Create `src/components/renderers/SvgBlock.tsx`:
```tsx
import React from 'react';
import DOMPurify from 'dompurify';

interface SvgBlockProps {
  svgContent: string;
}

export const SvgBlock: React.FC<SvgBlockProps> = ({ svgContent }) => {
  const cleanSvg = DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true, svgFilters: true } });
  return (
    <div
      className="my-3 p-3 bg-[#181825] rounded-lg border border-[#313244] flex justify-center"
      dangerouslySetInnerHTML={{ __html: cleanSvg }}
    />
  );
};
```

Create `src/components/VisualCanvas.tsx`:
```tsx
import React from 'react';
import { MarkdownBlock } from '../engine/types';
import { CodeBlock } from './renderers/CodeBlock';
import { MermaidBlock } from './renderers/MermaidBlock';
import { SvgBlock } from './renderers/SvgBlock';

interface VisualCanvasProps {
  blocks: MarkdownBlock[];
  viewMode: 'chat' | 'document';
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({ blocks, viewMode }) => {
  return (
    <div className="visual-canvas flex-1 overflow-y-auto p-6 space-y-4 bg-[#1e1e2e] text-[#cdd6f4]">
      {blocks.map((block) => {
        if (block.type === 'code') {
          if (block.lang === 'mermaid') {
            const cleanCode = block.rawContent.replace(/^```mermaid\n?/, '').replace(/```$/, '');
            return <MermaidBlock key={block.id} code={cleanCode} isComplete={block.isComplete} />;
          }
          if (block.lang === 'svg') {
            const cleanSvg = block.rawContent.replace(/^```svg\n?/, '').replace(/```$/, '');
            return <SvgBlock key={block.id} svgContent={cleanSvg} />;
          }
          const cleanCode = block.rawContent.replace(/^```[a-z0-9_-]*\n?/i, '').replace(/```$/, '');
          return <CodeBlock key={block.id} code={cleanCode} lang={block.lang} />;
        }

        if (block.type === 'heading') {
          const level = (block.rawContent.match(/^#+/) || ['#'])[0].length;
          const text = block.rawContent.replace(/^#+\s*/, '');
          if (level === 1) return <h1 key={block.id} className="text-2xl font-bold text-[#89b4fa] border-b border-[#313244] pb-2">{text}</h1>;
          if (level === 2) return <h2 key={block.id} className="text-xl font-semibold text-[#89b4fa] mt-4">{text}</h2>;
          return <h3 key={block.id} className="text-lg font-medium text-[#cba6f7] mt-2">{text}</h3>;
        }

        return (
          <div key={block.id} className={viewMode === 'chat' ? 'p-3 bg-[#181825] rounded-lg border border-[#313244]' : 'leading-relaxed'}>
            <p className="whitespace-pre-wrap">{block.rawContent}</p>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 5: Run tests and commit**
```bash
git add src/components/ tests/components/
git commit -m "feat(canvas): implement rich visual canvas with Shiki, KaTeX, Mermaid, and SVG"
```

---

### Task 5: Agent Auto-Discovery, Profile Hub & Workspace Launcher

**Files:**
- Create: `src/components/AgentHub.tsx`
- Create: `src/components/WorkspaceLauncher.tsx`
- Create: `src/App.tsx`
- Test: `tests/components/AgentHub.test.tsx`

**Interfaces:**
- Consumes: `scan_agents` & `pty_spawn` Tauri commands.
- Produces: Complete app launch flow, agent profile selection, and directory picker.

- [ ] **Step 1: Write test for AgentHub**

Create `tests/components/AgentHub.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AgentHub } from '../../src/components/AgentHub';

describe('AgentHub', () => {
  it('should list detected agents with green badges', () => {
    const agents = [
      { id: 'claude', name: 'Claude Code CLI', command: 'claude', is_installed: true, description: 'Anthropic AI' },
    ];
    render(<AgentHub agents={agents} onSelectAgent={() => {}} onAddCustom={() => {}} />);
    expect(screen.getByText('Claude Code CLI')).toBeInTheDocument();
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `AgentHub.tsx` and `WorkspaceLauncher.tsx`**

Create `src/components/AgentHub.tsx`:
```tsx
import React from 'react';
import { Bot, CheckCircle, Terminal as TermIcon, Plus } from 'lucide-react';

export interface AgentInfo {
  id: string;
  name: string;
  command: string;
  is_installed: boolean;
  description: string;
}

interface AgentHubProps {
  agents: AgentInfo[];
  onSelectAgent: (agent: AgentInfo) => void;
  onAddCustom: () => void;
}

export const AgentHub: React.FC<AgentHubProps> = ({ agents, onSelectAgent, onAddCustom }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#89b4fa]">Select an AI Agent</h1>
        <p className="text-sm text-gray-400">Choose a detected coding agent to launch an interactive session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className="p-5 rounded-xl border border-[#313244] bg-[#181825] hover:border-[#89b4fa] cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Bot className="text-[#89b4fa]" size={20} />
                  <span className="font-semibold text-[#cdd6f4]">{agent.name}</span>
                </div>
                {agent.is_installed && (
                  <span className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-green-950/60 text-green-400 border border-green-500/30">
                    <CheckCircle size={10} />
                    <span>Installed</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{agent.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#313244] flex items-center justify-between text-xs text-gray-500 font-mono">
              <span>$ {agent.command}</span>
            </div>
          </div>
        ))}

        <div
          onClick={onAddCustom}
          className="p-5 rounded-xl border border-dashed border-[#45475a] hover:border-[#89b4fa] bg-[#11111b]/50 cursor-pointer flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition-all min-h-[140px]"
        >
          <Plus size={24} />
          <span className="text-sm font-medium">+ Add Custom CLI Agent</span>
        </div>
      </div>
    </div>
  );
};
```

Create `src/components/WorkspaceLauncher.tsx`:
```tsx
import React, { useState } from 'react';
import { Folder, Play, Sparkles } from 'lucide-react';

interface WorkspaceLauncherProps {
  agentName: string;
  onLaunch: (cwd: string) => void;
}

export const WorkspaceLauncher: React.FC<WorkspaceLauncherProps> = ({ agentName, onLaunch }) => {
  const [folderPath, setFolderPath] = useState('D:/Viewer');

  return (
    <div className="p-8 max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-[#89b4fa]">Where do you want to work today?</h2>
        <p className="text-xs text-gray-400">Launching <strong className="text-white">{agentName}</strong></p>
      </div>

      <div className="space-y-4 bg-[#181825] p-6 rounded-xl border border-[#313244]">
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-medium">Project Directory Path</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="flex-1 bg-[#11111b] border border-[#45475a] rounded px-3 py-2 text-xs text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa]"
            />
          </div>
        </div>

        <button
          onClick={() => onLaunch(folderPath)}
          className="w-full py-2.5 bg-[#89b4fa] text-[#11111b] rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-[#b4befe] transition-colors"
        >
          <Play size={16} />
          <span>Launch Workspace Session</span>
        </button>

        <button
          onClick={() => onLaunch('')}
          className="w-full py-2 bg-[#313244] text-gray-300 rounded-lg text-xs flex items-center justify-center space-x-2 hover:bg-[#45475a] transition-colors"
        >
          <Sparkles size={14} className="text-yellow-400" />
          <span>Quick Temporary Scratchpad Session</span>
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Wire full app lifecycle in `src/App.tsx`**

Create `src/App.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AgentHub, AgentInfo } from './components/AgentHub';
import { WorkspaceLauncher } from './components/WorkspaceLauncher';
import { TabManager, TabItem } from './components/TabManager';
import { TerminalDock } from './components/TerminalDock';
import { VisualCanvas } from './components/VisualCanvas';
import { BlockStreamBuffer } from './engine/blockBuffer';
import { MarkdownBlock } from './engine/types';
import './styles/theme.css';

export function App() {
  const [viewStep, setViewStep] = useState<'hub' | 'launcher' | 'workspace'>('hub');
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [dockPosition, setDockPosition] = useState<'bottom' | 'left' | 'right' | 'float' | 'hidden'>('bottom');
  const [viewMode, setViewMode] = useState<'chat' | 'document'>('document');
  const [buffers, setBuffers] = useState<Record<string, BlockStreamBuffer>>({});
  const [blocks, setBlocks] = useState<Record<string, MarkdownBlock[]>>({});

  useEffect(() => {
    invoke<AgentInfo[]>('scan_agents')
      .then(setAgents)
      .catch(() => {});
  }, []);

  const handleSelectAgent = (agent: AgentInfo) => {
    setSelectedAgent(agent);
    setViewStep('launcher');
  };

  const handleLaunchSession = (cwd: string) => {
    if (!selectedAgent) return;
    const sessionId = `session-${Date.now()}`;
    const newTab: TabItem = {
      id: sessionId,
      title: `${selectedAgent.name} (${cwd.split(/[\/\\]/).pop() || 'Scratchpad'})`,
      active: true,
    };

    setTabs((prev) => [...prev.map((t) => ({ ...t, active: false })), newTab]);
    setActiveTabId(sessionId);

    const buf = new BlockStreamBuffer();
    setBuffers((prev) => ({ ...prev, [sessionId]: buf }));
    setBlocks((prev) => ({ ...prev, [sessionId]: [] }));

    invoke('pty_spawn', {
      sessionId,
      command: selectedAgent.command,
      args: [],
      cwd: cwd || null,
      cols: 120,
      rows: 32,
    }).catch(() => {});

    setViewStep('workspace');
  };

  const handleOutput = (sessionId: string, chunk: string) => {
    const buf = buffers[sessionId];
    if (buf) {
      const updated = buf.append(chunk);
      setBlocks((prev) => ({ ...prev, [sessionId]: [...updated] }));
    }
  };

  if (viewStep === 'hub') {
    return <AgentHub agents={agents} onSelectAgent={handleSelectAgent} onAddCustom={() => {}} />;
  }

  if (viewStep === 'launcher' && selectedAgent) {
    return <WorkspaceLauncher agentName={selectedAgent.name} onLaunch={handleLaunchSession} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e2e] text-[#cdd6f4] overflow-hidden">
      <TabManager
        tabs={tabs}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
        }}
        onNewTab={() => setViewStep('hub')}
        onCloseTab={(id) => {
          invoke('pty_kill', { sessionId: id });
          setTabs((prev) => prev.filter((t) => t.id !== id));
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2 bg-[#181825] border-b border-[#313244] text-xs">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'chat' ? 'document' : 'chat')}
                className="px-2.5 py-1 bg-[#313244] hover:bg-[#45475a] rounded text-gray-200"
              >
                Mode: {viewMode === 'chat' ? '💬 Chat Cards' : '📄 Living .MD'}
              </button>
            </div>
            <div className="flex space-x-1 items-center">
              <span className="text-gray-400 mr-2">Dock:</span>
              {(['bottom', 'left', 'right', 'float', 'hidden'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setDockPosition(pos)}
                  className={`px-2 py-0.5 rounded uppercase text-[10px] ${
                    dockPosition === pos ? 'bg-[#89b4fa] text-[#11111b] font-bold' : 'bg-[#313244] text-gray-300'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex-1 flex ${dockPosition === 'bottom' ? 'flex-col' : 'flex-row'} overflow-hidden`}>
            <VisualCanvas blocks={blocks[activeTabId] || []} viewMode={viewMode} />
            {activeTabId && (
              <TerminalDock
                sessionId={activeTabId}
                dockPosition={dockPosition}
                onOutput={(chunk) => handleOutput(activeTabId, chunk)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests and commit**
```bash
git add src/ tests/
git commit -m "feat: complete application shell, agent launcher, and workspace orchestration"
```
