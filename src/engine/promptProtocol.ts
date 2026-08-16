export interface ModePromptConfig {
  mode: 'chat' | 'document';
  includeThoughts: boolean;
  includeMermaid: boolean;
  includeMath: boolean;
}

export const CHAT_MODE_PROMPT = `
[VIEWER PROTOCOL: CHAT MODE ACTIVE]
Format your responses for optimal card rendering:
1. Wrap internal planning, chain-of-thought, or multi-step reasoning inside <thought>...</thought> tags.
2. Format code blocks using standard markdown triple-backticks with explicit language identifiers (e.g. \`\`\`typescript, \`\`\`python).
3. Use \`\`\`mermaid for architectural diagrams, sequence flows, and process state machines.
4. Use standard LaTeX delimiters ($...$ for inline math, $$...$$ for display math).
5. Keep conversational explanations concise and structured in bullet points where appropriate.
`.trim();

export const DOCUMENT_MODE_PROMPT = `
[VIEWER PROTOCOL: LIVING DOCUMENT MODE ACTIVE]
Format your output as a comprehensive, publication-grade living Markdown document:
1. Structure output with clear hierarchical headings (# Document Title, ## Section, ### Sub-Section).
2. All major sections will automatically populate the live Table of Contents.
3. Include clear introductory summaries, data tables (GFM format), and code implementations with language tags.
4. Use \`\`\`mermaid for architectural diagrams and flowcharts.
5. Use $$...$$ for mathematical formulations and equations.
6. Avoid conversational filler; focus on producing a clean, exportable technical specification.
`.trim();

export const SAMPLE_RICH_DOCUMENT = `# 🚀 Agentic Architecture & Real-Time Engine Specification

## 1. Executive Summary
The **Agent Terminal & Rich Markdown Workspace** is an ultra-fast control plane designed to bridge CLI coding agents with rich visual documents. It combines native pseudo-terminals with real-time ANSI stream colorization, deferred Mermaid graphics, and KaTeX mathematical rendering.

---

## 2. Theoretical Formulation & Math
The optimal terminal stream buffer throughput is modeled by the following relation:

$$C(t) = \\lim_{\\Delta t \\to 0} \\sum_{i=1}^{N} \\frac{\\Phi_i(\\tau)}{\\sigma^2 + \\epsilon} \\cdot e^{-\\lambda (t - \\tau)}$$

Inline mathematical relationships such as $E = mc^2$ and Euler's identity $e^{i\\pi} + 1 = 0$ are rendered with full optical clarity.

---

## 3. System Architecture Diagram
The diagram below illustrates the bidirectional streaming pipeline between the Rust PTY supervisor and the frontend visual canvas:

\`\`\`mermaid
graph TD
    A[User Prompt / CLI Action] -->|Input Stream| B[Rust PTY Supervisor]
    B -->|ConPTY Child Process| C[Claude / Codex / OMP]
    C -->|Raw ANSI Stream| D[Stream Colorizer & Tokenizer]
    D -->|Parsed Blocks| E[Visual Canvas]
    E -->|Chat Cards| F[Turn Cards & Collapsible Tools]
    E -->|Document Mode| G[Living Note with Table of Contents]
\`\`\`

---

## 4. Implementation Example (TypeScript)

\`\`\`typescript
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

export class AgentSupervisor {
  private activeSessions = new Map<string, any>();

  async spawnAgent(sessionId: string, command: string, cwd: string): Promise<void> {
    const process = spawn(command, [], { cwd, shell: true });
    this.activeSessions.set(sessionId, process);
    console.log(\`[Supervisor] Session \${sessionId} spawned in \${cwd}\`);
  }
}
\`\`\`

---

## 5. Visual Git Diff

\`\`\`diff
--- a/src/engine/terminal.ts
+++ b/src/engine/terminal.ts
@@ -12,4 +12,6 @@ export function initTerminal(): Terminal {
-  const background = '#181825';
+  const background = '#000000';
+  const foreground = '#ffffff';
+  const cursorBlink = true;
\`\`\`

---

## 6. Performance Benchmarks

| Metric | Traditional Terminal | Viewer App (Tauri v2) | Improvement |
|---|---|---|---|
| **Memory Footprint** | ~180 MB (Electron) | **~35 MB (Tauri v2)** | **5.1x Lighter** |
| **Markdown Rendering** | ❌ None (Plain Text) | **✅ Full Suite (KaTeX + Mermaid)** | **Infinite** |
| **ANSI TrueColor** | ⚠️ Partial | **✅ 100% TrueColor RGB** | **Lossless** |
| **Multi-Tabs** | ❌ Separate Windows | **✅ Browser-Style Multi-Tabs** | **Unified** |
`;

export function getModePrompt(mode: 'chat' | 'document'): string {
  return mode === 'chat' ? CHAT_MODE_PROMPT : DOCUMENT_MODE_PROMPT;
}
