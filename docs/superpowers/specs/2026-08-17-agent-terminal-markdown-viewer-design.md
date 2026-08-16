# Design Specification: Agent Terminal & Rich Markdown Workspace (Viewer)

**Date**: 2026-08-17  
**Status**: Approved  
**Author**: DeepMind Agentic Team & User  
**Target Platform**: Windows 10/11 (ConPTY), macOS (POSIX PTY), Linux  
**Runtime**: Tauri v2 (Rust Core + React / Vite Webview)

---

## 1. Executive Summary

### 1.1 Problem Statement
Developers using AI coding CLI agents (Claude Code CLI, Codex CLI, OMP/Pi, Hermes, Aider) interact with them via standard terminal emulators. Terminals are fundamentally plain-text grid renderers: they cannot natively display formatted Markdown headings, syntax-highlighted code blocks with 1-click copy buttons, LaTeX mathematical formulas, Mermaid sequence and architecture diagrams, inline SVG vector graphics, or visual side-by-side git diffs. Furthermore, copying code from terminals often introduces indentation and line-wrapping artifacts.

### 1.2 Solution
The **Agent Terminal & Rich Markdown Workspace (`Viewer`)** is a dedicated desktop application that pairs a **high-performance interactive pseudo-terminal (PTY)** with a **live, rich visual Markdown canvas**. It enables developers to launch and control any CLI agent, interactively answer CLI prompts via an embedded terminal, while simultaneously watching the agent's output render in real time into a vibrant, colorful, and richly formatted document.

---

## 2. Core User Experience & Workflows

### 2.1 Screen 1: Agent Hub & Profile Manager
- **Smart Auto-Discovery**: Automatically scans the system `PATH` and standard package directories (`npm -g`, `pip`, `cargo`, `~/.claude`, `~/.omp`) on launch. Renders clean cards for detected agents (`Claude Code`, `Codex`, `OMP`, `Hermes`) with a green **"Installed"** badge.
- **"+ Add Custom Agent"**: Enables adding arbitrary CLI commands or script binaries with custom arguments.
- **Multi-Profile Configurations**: Allows users to save named profiles for any agent (e.g., *"Claude — Default"*, *"Claude — Auto-Approve"*, *"Codex — Code Review Mode"*), configuring custom CLI flags, environment variables, and pre-set instructions.

### 2.2 Screen 2: Workspace & Project Launcher
- Prompts: *"Where do you want to work today?"*
- Three launch paths:
  1. **Open Existing Project**: Native file browser to select a local directory.
  2. **Recent Projects**: 1-click launch into recently opened project folders.
  3. **Temporary Scratchpad Session**: 1-click generation of an isolated temporary workspace for fast experiments.

### 2.3 Screen 3: The Multi-Tab Power Workspace (Main View)
- **Browser-Style Multi-Tabs**: Open and run multiple agent sessions in parallel (e.g., Tab 1: Claude Code in Repo A, Tab 2: Codex in Repo B, Tab 3: OMP in Repo C).
- **Flexible 3-Pane Layout**:
  - **Left Collapsible Sidebar**: Switch between open tabs, agent profiles, and project files.
  - **Dockable Terminal Pane**: Embedded `xterm.js` terminal with 5 docking modes (Dock Bottom, Dock Left, Dock Right, Float, or Hidden).
  - **Rich Visual Canvas**: Dual-mode rendered view (Chat Mode ⟷ Live .MD Document Mode).

---

## 3. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TAURI V2 DESKTOP APPLICATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  🦀 RUST BACKEND CORE                                                       │
│  ├── agent_scanner       -> Scans PATH & global bins for detected agents    │
│  ├── pty_supervisor      -> portable-pty (ConPTY on Windows, POSIX on Unix) │
│  ├── session_manager     -> HashMap<SessionId, PtyInstance> process manager │
│  └── session_store       -> Persists profiles, metadata, JSON transcripts   │
├─────────────────────────────────────────────────────────────────────────────┤
│  IPC LAYER (Tauri v2 Events & Commands)                                     │
│  ├── Commands: pty_spawn, pty_write, pty_resize, pty_kill, scan_agents      │
│  └── Events: pty_output:<session_id>, pty_exit:<session_id>                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚛️ REACT / VITE WEBVIEW FRONTEND                                            │
│  ├── TabManager          -> Browser-style tab bar & session state           │
│  ├── WorkspaceLayout     -> Resizable 3-pane layout & docking manager       │
│  ├── TerminalDock        -> xterm.js + WebGLAddon + FitAddon                │
│  ├── StreamColorizer     -> ANSI-to-HTML/CSS tokenization & block bufferer  │
│  └── VisualCanvas        -> Dual-Mode Visual Engine:                        │
│        ├── Mode A: Chat Cards (Turn cards with collapsible tools/diffs)     │
│        ├── Mode B: Live .MD Document (Continuous note with Table of Content)│
│        └── RichMediaSuite:                                                  │
│              ├── Shiki (Syntax highlighting + copy button + badge)          │
│              ├── KaTeX (LaTeX math inline $ and block $$)                   │
│              ├── Mermaid.js (Deferred block rendering for flowcharts)       │
│              ├── SVG Safe Renderer (DOMPurify sanitized vector graphics)    │
│              └── Unified & Split Git Diffs + GFM Tables                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Specifications

### 4.1 Backend Architecture (Rust)

#### 4.1.1 `pty_supervisor`
- **Crate**: `portable-pty = "0.8"`
- **Responsibilities**:
  - Implements `SessionManager` struct wrapped in `Arc<Mutex<HashMap<String, PtySession>>>`.
  - Spawns child processes attached to virtual pseudo-terminals (using Windows ConPTY on Windows 10/11 and openpty on Unix).
  - Configures environment variables, working directory, and initial terminal dimensions (`cols: 120, rows: 32`).
  - Runs dedicated background reader threads for each PTY instance, streaming raw output chunks to the frontend via `app_handle.emit(&format!("pty_output:{}", session_id), chunk)`.
  - Listens for frontend resize signals (`pty_resize(session_id, cols, rows)`) and triggers native window resize syscalls (`TIOCSWINSZ` / ConPTY buffer resize).
  - Handles graceful termination on tab closure (`SIGTERM` / `TerminateProcess`).

#### 4.1.2 `agent_scanner`
- **Responsibilities**:
  - Probes system environment variables and `PATH` for known agent binaries: `claude`, `codex`, `omp`, `pi`, `hermes`, `aider`.
  - Checks standard global package locations (`%APPDATA%\npm`, `~/.cargo/bin`, Python user scripts).
  - Executes quick non-blocking version probes (e.g. `claude --version`) with a 500ms deadline.
  - Returns `Vec<AgentInfo>` where `AgentInfo = { id, name, command, path, is_installed, version, icon }`.

#### 4.1.3 `session_store`
- **Responsibilities**:
  - Manages persistent user preferences, custom agent profiles, and session transcript history.
  - Saves data as structured JSON under `%APPDATA%/viewer/` (Windows) or `~/.config/viewer/` (Linux/macOS).

---

### 4.2 Frontend Architecture (TypeScript / React)

#### 4.2.1 `TabManager`
- Manages an array of `SessionTab` objects:
  ```ts
  interface SessionTab {
    id: string;
    title: string;
    agentId: string;
    cwd: string;
    status: 'idle' | 'running' | 'exited';
    terminalBuffer: string[];
    markdownHistory: string;
    viewMode: 'chat' | 'document';
    dockPosition: 'bottom' | 'left' | 'right' | 'float' | 'hidden';
  }
  ```
- Supports adding new tabs, closing tabs (with confirmation if a process is active), reordering tabs, and switching active tab context with zero state loss.

#### 4.2.2 `TerminalDock`
- Embeds `xterm.js` terminal emulator instance per tab.
- Configured with `WebGLAddon` (falls back to `CanvasAddon` if WebGL unavailable) and `FitAddon`.
- Binds keyboard and mouse events: `terminal.onData((data) => invoke('pty_write', { sessionId, data }))`.
- Supports 5 dynamic dock positions via CSS Grid / Flexbox:
  - `dock-bottom`: 30% height default, full width.
  - `dock-left`: 40% width default, full height.
  - `dock-right`: 40% width default, full height.
  - `float`: Draggable and resizable floating window overlay.
  - `hidden`: 100% canvas space, toggleable via `Ctrl+\`` or toolbar button.
- Integrates `ResizeObserver` on the container to call `fitAddon.fit()` and notify the backend of new `(cols, rows)`.

#### 4.2.3 `StreamColorizer` & ANSI-to-Markdown Pipeline
- **ANSI Color Preservation**:
  - Uses an ANSI tokenizer that maps standard 16 terminal colors, 256 indexed colors, and 24-bit TrueColor RGB (`\x1b[38;2;R;G;Bm`) into styled HTML `<span class="ansi-..." style="color: ...">` tags.
  - Aligns color palettes with modern themes (Catppuccin Macchiato, Dracula, Tokyo Night).
- **Block Stream Buffering**:
  - Implements an incremental line-and-block parser.
  - Groups incoming text into top-level blocks (headers, paragraphs, code fences, blockquotes, tables).
  - Freezes and caches finalized blocks to avoid re-rendering entire documents.
  - Applies a **Deferred Block Buffer** to ` ```mermaid ` and ` $$ ` blocks: displays an animated streaming pulse loader while the code fence is open, and executes full SVG/KaTeX rendering the moment the closing delimiter arrives.

#### 4.2.4 `VisualCanvas` & Dual View Modes
- **Mode A: Chat Cards Mode**:
  - Renders conversation turns as structured message cards.
  - User prompts are highlighted with distinct styling.
  - AI reasoning, file read outputs, and command traces are rendered inside clean collapsible accordions (`<details><summary>Tool Execution</summary>...</details>`).
- **Mode B: Live .MD Document Mode**:
  - Renders a continuous, elegant Markdown canvas (Notion / Obsidian aesthetic).
  - Features a sticky **Table of Contents (TOC)** sidebar derived from document headings (`#`, `##`, `###`).
  - Includes a **1-Click Export** button to save the rendered document directly as `.md`.

#### 4.2.5 `RichMediaSuite`
- **Code Highlighting**: `shiki` with VS Code grammar fidelity, theme switching, language badges, line numbers, and a 1-click copy button.
- **LaTeX Equations**: `katex` rendering inline math (`$E=mc^2$`) and display blocks (`$$\int f(x) dx$$`).
- **Diagrams**: `mermaid.js` rendering flowcharts, sequence diagrams, class diagrams, and state machines directly into interactive SVGs.
- **Vector Graphics**: Direct inline `<svg>` rendering sanitized through `DOMPurify` to ensure security.
- **Git Diffs**: Visual green/red unified and split diff views.
- **Tables**: Styled GitHub Flavored Markdown (GFM) tables with responsive horizontal scrolling.

---

## 5. IPC API & Communication Protocols

### 5.1 Tauri Commands (Frontend -> Backend)
| Command | Parameters | Description |
|---|---|---|
| `scan_agents` | `{}` | Scans system PATH and returns detected agent metadata. |
| `pty_spawn` | `{ agentCommand: string, args: string[], cwd: string, cols: number, rows: number }` | Spawns agent in a new PTY instance, returns `sessionId`. |
| `pty_write` | `{ sessionId: string, data: string }` | Sends keystrokes / text data to the agent's PTY stdin. |
| `pty_resize` | `{ sessionId: string, cols: number, rows: number }` | Sends terminal resize dimensions to ConPTY / PTY. |
| `pty_kill` | `{ sessionId: string }` | Terminates the agent process and closes PTY file descriptors. |
| `export_markdown`| `{ defaultPath: string, content: string }` | Opens native file save dialog to export `.md` file. |

### 5.2 Tauri Events (Backend -> Frontend)
| Event Name | Payload | Description |
|---|---|---|
| `pty_output:<session_id>` | `string` (UTF-8 bytes) | Emitted whenever the agent outputs data to stdout/stderr. |
| `pty_exit:<session_id>` | `{ exitCode: number }` | Emitted when the agent process terminates. |

---

## 6. Error Handling & Edge Cases

1. **Process Crash / Premature Exit**:
   - The frontend catches `pty_exit`, marks the tab status as `exited`, displays an inline status banner with the exit code, and keeps the full terminal buffer and markdown transcript accessible.
2. **Terminal Encoding Glitches / Broken UTF-8 Sequences**:
   - Rust PTY reader utilizes a lossy UTF-8 decoder (`String::from_utf8_lossy`) to prevent process panic on malformed byte boundaries during fast binary streaming.
3. **Incomplete Markdown Syntax during Streaming**:
   - The Block Stream Buffer automatically tolerates open asterisks (`**`), unclosed code fences, and unterminated table rows without throwing DOM errors.
4. **Window & Pane Resizing**:
   - Debounced `ResizeObserver` (50ms) ensures terminal `fitAddon.fit()` and backend `pty_resize` do not thrash during smooth drag-resizing.

---

## 7. Verification & Testing Strategy

1. **Backend Unit & Integration Tests (Rust)**:
   - `test_agent_scanner`: Verifies PATH discovery and executable resolution.
   - `test_pty_spawn_and_write`: Spawns a lightweight shell/CLI process, writes commands, and asserts stdout stream delivery.
   - `test_pty_resize_and_kill`: Validates ConPTY buffer resizing and clean process termination.
2. **Frontend Parser Tests (Vitest)**:
   - `test_ansi_color_tokenizer`: Verifies 16-color, 256-color, and TrueColor RGB conversion into styled HTML spans.
   - `test_block_stream_buffer`: Validates incremental block freezing and deferred Mermaid buffering without flicker.
3. **End-to-End Smoke Testing**:
   - Launch application -> Auto-detect agents -> Launch Claude Code / OMP in a test directory -> Type prompts in embedded terminal -> Verify live colorful Markdown, syntax-highlighted code blocks, LaTeX math, and Mermaid diagrams render cleanly in real time.
