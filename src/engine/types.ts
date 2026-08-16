export interface TokenSpan {
  text: string;
  color: string | null;
  bgColor?: string | null;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type BlockType = 'heading' | 'paragraph' | 'code' | 'table' | 'math' | 'list' | 'diff' | 'svg';

export interface MarkdownBlock {
  id: string;
  type: BlockType;
  rawContent: string;
  lang?: string;
  isComplete: boolean;
  timestamp: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  command: string;
  path?: string | null;
  is_installed: boolean;
  description: string;
}

export interface SessionTab {
  id: string;
  title: string;
  agentId: string;
  cwd: string;
  status: 'idle' | 'running' | 'exited';
  active: boolean;
}

export type DockPosition = 'bottom' | 'left' | 'right' | 'float' | 'hidden';
export type ViewMode = 'chat' | 'document';
