import { MarkdownBlock, BlockType } from './types';
import { stripAnsi } from './ansiTokenizer';

interface InProgressBlock {
  type: BlockType;
  lines: string[];
  lang?: string;
  isComplete: boolean;
}

export class BlockStreamBuffer {
  private rawBuffer: string = '';
  private cleanText: string = '';
  private blocks: MarkdownBlock[] = [];

  append(chunk: string): MarkdownBlock[] {
    this.rawBuffer += chunk;
    this.cleanText = stripAnsi(this.rawBuffer);
    this.reparse();
    return this.blocks;
  }

  appendUserPrompt(promptText: string): MarkdownBlock[] {
    this.blocks.push({
      id: `user-prompt-${Date.now()}`,
      type: 'user-prompt',
      rawContent: promptText,
      isComplete: true,
      timestamp: Date.now(),
    });
    this.rawBuffer += `\n\nUser: ${promptText}\n\n`;
    this.cleanText += `\n\nUser: ${promptText}\n\n`;
    return this.blocks;
  }

  getText(): string {
    return this.cleanText;
  }

  getBlocks(): MarkdownBlock[] {
    return this.blocks;
  }

  clear(): void {
    this.rawBuffer = '';
    this.cleanText = '';
    this.blocks = [];
  }

  private reparse(): void {
    const lines = this.cleanText.split('\n');
    const newBlocks: MarkdownBlock[] = [];
    let currentBlock: InProgressBlock | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handling inside Thought / Thinking tag
      if (currentBlock && currentBlock.type === 'thought') {
        currentBlock.lines.push(line);
        if (line.includes('</thought>') || line.includes('</thinking>') || line.trim() === '---') {
          currentBlock.isComplete = true;
          newBlocks.push({
            id: `block-${newBlocks.length}`,
            type: 'thought',
            rawContent: currentBlock.lines.join('\n'),
            isComplete: true,
            timestamp: Date.now(),
          });
          currentBlock = null;
        }
        continue;
      }

      // Handling opening Thought / Thinking tag
      if (
        line.trim().startsWith('<thought>') ||
        line.trim().startsWith('<thinking>') ||
        line.trim().toLowerCase().startsWith('*thinking*')
      ) {
        currentBlock = { type: 'thought', lines: [line], isComplete: false };
        continue;
      }

      // Handling inside code fence
      if (currentBlock && currentBlock.type === 'code') {
        currentBlock.lines.push(line);
        if (line.trim().startsWith('```')) {
          currentBlock.isComplete = true;
          const blockType: BlockType =
            currentBlock.lang === 'diff' ? 'diff' : currentBlock.lang === 'svg' ? 'svg' : 'code';
          newBlocks.push({
            id: `block-${newBlocks.length}`,
            type: blockType,
            rawContent: currentBlock.lines.join('\n'),
            lang: currentBlock.lang,
            isComplete: true,
            timestamp: Date.now(),
          });
          currentBlock = null;
        }
        continue;
      }

      // Handling opening code fence
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim().toLowerCase();
        currentBlock = { type: 'code', lines: [line], lang, isComplete: false };
        continue;
      }

      // Handling LaTeX Math block ($$)
      if (line.trim().startsWith('$$')) {
        if (currentBlock && currentBlock.type === 'math') {
          currentBlock.lines.push(line);
          newBlocks.push({
            id: `block-${newBlocks.length}`,
            type: 'math',
            rawContent: currentBlock.lines.join('\n'),
            isComplete: true,
            timestamp: Date.now(),
          });
          currentBlock = null;
        } else {
          currentBlock = { type: 'math', lines: [line], isComplete: false };
        }
        continue;
      }

      if (currentBlock && currentBlock.type === 'math') {
        currentBlock.lines.push(line);
        continue;
      }

      // Handling Headings (# Heading)
      if (line.trim().startsWith('#')) {
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
        newBlocks.push({
          id: `block-${newBlocks.length}`,
          type: 'heading',
          rawContent: line,
          isComplete: true,
          timestamp: Date.now(),
        });
        continue;
      }

      // Handling Paragraph blank line separator
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

      // Building Paragraph
      if (!currentBlock) {
        currentBlock = { type: 'paragraph', lines: [line], isComplete: false };
      } else {
        currentBlock.lines.push(line);
      }
    }

    if (currentBlock) {
      const blockType: BlockType =
        currentBlock.lang === 'diff' ? 'diff' : currentBlock.lang === 'svg' ? 'svg' : currentBlock.type;
      newBlocks.push({
        id: `block-${newBlocks.length}`,
        type: blockType,
        rawContent: currentBlock.lines.join('\n'),
        lang: currentBlock.lang,
        isComplete: false,
        timestamp: Date.now(),
      });
    }

    // Preserve any dynamically injected user prompts
    const userPrompts = this.blocks.filter((b) => b.type === 'user-prompt');
    if (userPrompts.length > 0 && newBlocks.length === 0) {
      this.blocks = userPrompts;
    } else if (newBlocks.length > 0) {
      this.blocks = newBlocks;
    }
  }
}
